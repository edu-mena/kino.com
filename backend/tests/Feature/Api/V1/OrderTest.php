<?php

use App\Models\Courier;
use App\Models\DeliveryPolicy;
use App\Models\MenuItem;
use App\Models\Offer;
use App\Models\PaymentMethod;
use App\Models\Restaurant;
use App\Models\RestaurantMenu;
use App\Models\SavedAddress;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

function createOrderableRestaurant(array $attrs = []): Restaurant
{
    return Restaurant::factory()->create(array_merge([
        'fulfillment_modes' => ['delivery', 'takeaway', 'dinein'],
        'accepted_payment_methods' => ['cash', 'multicaixa_express'],
        'caution_modes_for_orders' => ['delivery'],
        'caution_amount' => 3000,
        'delivery_fee' => 500,
        'is_delivery_available' => true,
        'orders_paused_manually' => false,
    ], $attrs));
}

beforeEach(function () {
    PaymentMethod::query()->firstOrCreate(['code' => 'cash'], ['name' => 'Numerário', 'is_digital' => false, 'position' => 1]);
    PaymentMethod::query()->firstOrCreate(['code' => 'multicaixa_express'], ['name' => 'Multicaixa Express', 'is_digital' => true, 'position' => 2]);
    DeliveryPolicy::query()->firstOrCreate(['id' => 1], ['free_radius_km' => 5, 'per_km_surcharge_kz' => 150]);
});

test('cliente vê os próprios pedidos de vários restaurantes, com nome/imagem do restaurante', function () {
    $restaurantA = createOrderableRestaurant();
    $restaurantB = createOrderableRestaurant();
    $customer = User::factory()->create();
    $other = User::factory()->create();

    $restaurantA->orders()->create([
        'user_id' => $customer->id, 'fulfillment_type' => 'takeaway',
        'customer_name' => 'Ana', 'customer_phone' => '900',
        'pickup_asap' => true, 'status' => 'pending', 'estimated_minutes' => 30,
        'subtotal' => 1000, 'delivery_fee' => 0, 'total' => 1000,
    ]);
    $restaurantB->orders()->create([
        'user_id' => $customer->id, 'fulfillment_type' => 'takeaway',
        'customer_name' => 'Ana', 'customer_phone' => '900',
        'pickup_asap' => true, 'status' => 'pending', 'estimated_minutes' => 30,
        'subtotal' => 2000, 'delivery_fee' => 0, 'total' => 2000,
    ]);
    $restaurantA->orders()->create([
        'user_id' => $other->id, 'fulfillment_type' => 'takeaway',
        'customer_name' => 'Outro', 'customer_phone' => '901',
        'pickup_asap' => true, 'status' => 'pending', 'estimated_minutes' => 30,
        'subtotal' => 500, 'delivery_fee' => 0, 'total' => 500,
    ]);

    $response = $this->actingAs($customer, 'sanctum')->getJson('/api/v1/orders');

    $response->assertOk()->assertJsonCount(2, 'data');
    expect($response->json('data.0.restaurantName'))->not->toBeNull();
});

test('convidado cria um pedido takeaway sem autenticação e recebe guest_token uma única vez', function () {
    $restaurant = createOrderableRestaurant();
    $menu = RestaurantMenu::factory()->for($restaurant)->create();
    $item = MenuItem::factory()->for($restaurant)->create(['menu_id' => $menu->id, 'price' => 2000]);

    $response = $this->postJson("/api/v1/restaurants/{$restaurant->uuid}/orders", [
        'fulfillment_type' => 'takeaway',
        'customer_name' => 'Ana Convidada',
        'customer_phone' => '923000000',
        'pickup_asap' => true,
        'items' => [['menu_item_id' => $item->uuid, 'qty' => 2]],
    ], ['Idempotency-Key' => Str::uuid()->toString()]);

    $response->assertStatus(201)
        ->assertJsonPath('data.subtotal', 4000)
        ->assertJsonPath('data.status', 'pending')
        ->assertJsonPath('data.paymentMethod', null);
    expect($response->json('data.guestToken'))->not->toBeNull();
});

test('pedido não escolhe payment_method_code/caution no checkout — só o restaurante define ao aceitar', function () {
    $restaurant = createOrderableRestaurant();
    $menu = RestaurantMenu::factory()->for($restaurant)->create();
    $item = MenuItem::factory()->for($restaurant)->create(['menu_id' => $menu->id, 'price' => 1000]);

    $response = $this->postJson("/api/v1/restaurants/{$restaurant->uuid}/orders", [
        'fulfillment_type' => 'takeaway',
        'customer_name' => 'X',
        'customer_phone' => '900',
        'pickup_asap' => true,
        'items' => [['menu_item_id' => $item->uuid, 'qty' => 1]],
        // tentativa maliciosa de injetar estes campos — devem ser ignorados
        'payment_method_code' => 'cash',
        'caution_required' => 999999,
    ], ['Idempotency-Key' => Str::uuid()->toString()]);

    $response->assertStatus(201)
        ->assertJsonPath('data.paymentMethod', null)
        ->assertJsonPath('data.cautionRequired', null);
});

test('preço de linha soma extras de ingredientes, subtotal/total corretos', function () {
    $restaurant = createOrderableRestaurant();
    $menu = RestaurantMenu::factory()->for($restaurant)->create();
    $item = MenuItem::factory()->for($restaurant)->create(['menu_id' => $menu->id, 'price' => 2000]);
    $extra = $item->ingredients()->create(['name' => 'Bacon extra', 'removable' => false, 'extra_price' => 500, 'position' => 1]);
    $free = $item->ingredients()->create(['name' => 'Cebola', 'removable' => true, 'extra_price' => 0, 'position' => 2]);

    $response = $this->postJson("/api/v1/restaurants/{$restaurant->uuid}/orders", [
        'fulfillment_type' => 'takeaway',
        'customer_name' => 'X', 'customer_phone' => '900', 'pickup_asap' => true,
        'items' => [[
            'menu_item_id' => $item->uuid, 'qty' => 2,
            'selected_ingredients' => [
                ['ingredient_id' => $extra->id, 'included' => true],
                ['ingredient_id' => $free->id, 'included' => false],
            ],
        ]],
    ], ['Idempotency-Key' => Str::uuid()->toString()]);

    // (2000 + 500) * 2 = 5000
    $response->assertStatus(201)->assertJsonPath('data.subtotal', 5000)->assertJsonPath('data.total', 5000);
});

test('taxa de entrega usa Haversine real quando restaurante e morada têm lat/lng', function () {
    $restaurant = createOrderableRestaurant(['lat' => -8.8383, 'lng' => 13.2344, 'delivery_fee' => 500]);
    $menu = RestaurantMenu::factory()->for($restaurant)->create();
    $item = MenuItem::factory()->for($restaurant)->create(['menu_id' => $menu->id, 'price' => 1000]);
    $user = User::factory()->create();
    // ~15km do restaurante -> fora do raio livre (5km) de 10km -> ceil(10)*150 = 1500 extra
    $address = SavedAddress::factory()->for($user)->create(['lat' => -8.95, 'lng' => 13.2344]);

    $response = $this->actingAs($user, 'sanctum')
        ->postJson("/api/v1/restaurants/{$restaurant->uuid}/orders", [
            'fulfillment_type' => 'delivery',
            'saved_address_id' => $address->uuid,
            'items' => [['menu_item_id' => $item->uuid, 'qty' => 1]],
        ], ['Idempotency-Key' => Str::uuid()->toString()]);

    $response->assertStatus(201);
    expect($response->json('data.deliveryFee'))->toBeGreaterThan(500);
});

test('código promocional de 20% aplica desconto sobre o subtotal', function () {
    $restaurant = createOrderableRestaurant();
    $menu = RestaurantMenu::factory()->for($restaurant)->create();
    $item = MenuItem::factory()->for($restaurant)->create(['menu_id' => $menu->id, 'price' => 1000]);
    Offer::query()->create([
        'restaurant_id' => null, 'type' => 'discount', 'title' => 'Luku 20%',
        'code' => 'LUKU20', 'percent_off' => 20, 'starts_at' => now()->subDay(),
    ]);

    $response = $this->postJson("/api/v1/restaurants/{$restaurant->uuid}/orders", [
        'fulfillment_type' => 'takeaway', 'customer_name' => 'X', 'customer_phone' => '900', 'pickup_asap' => true,
        'items' => [['menu_item_id' => $item->uuid, 'qty' => 1]],
        'promo_code' => 'luku20',
    ], ['Idempotency-Key' => Str::uuid()->toString()]);

    $response->assertStatus(201)
        ->assertJsonPath('data.subtotal', 1000)
        ->assertJsonPath('data.total', 800)
        ->assertJsonPath('data.promoPercentOff', 20);
});

test('Idempotency-Key repetido devolve a MESMA resposta sem criar 2 pedidos', function () {
    $restaurant = createOrderableRestaurant();
    $menu = RestaurantMenu::factory()->for($restaurant)->create();
    $item = MenuItem::factory()->for($restaurant)->create(['menu_id' => $menu->id, 'price' => 1000]);
    $key = Str::uuid()->toString();

    $payload = [
        'fulfillment_type' => 'takeaway', 'customer_name' => 'X', 'customer_phone' => '900', 'pickup_asap' => true,
        'items' => [['menu_item_id' => $item->uuid, 'qty' => 1]],
    ];

    $first = $this->postJson("/api/v1/restaurants/{$restaurant->uuid}/orders", $payload, ['Idempotency-Key' => $key]);
    $second = $this->postJson("/api/v1/restaurants/{$restaurant->uuid}/orders", $payload, ['Idempotency-Key' => $key]);

    $first->assertStatus(201);
    $second->assertStatus(201);
    expect($second->json('data.id'))->toBe($first->json('data.id'));
    expect($second->headers->get('Idempotency-Replayed'))->toBe('true');
    expect($restaurant->orders()->count())->toBe(1);
});

test('POST de pedido sem Idempotency-Key é rejeitado', function () {
    $restaurant = createOrderableRestaurant();
    $menu = RestaurantMenu::factory()->for($restaurant)->create();
    $item = MenuItem::factory()->for($restaurant)->create(['menu_id' => $menu->id, 'price' => 1000]);

    $this->postJson("/api/v1/restaurants/{$restaurant->uuid}/orders", [
        'fulfillment_type' => 'takeaway', 'customer_name' => 'X', 'customer_phone' => '900', 'pickup_asap' => true,
        'items' => [['menu_item_id' => $item->uuid, 'qty' => 1]],
    ])->assertStatus(400);
});

test('caução só é anexada no accept quando o modo está em caution_modes_for_orders', function () {
    $restaurant = createOrderableRestaurant(['caution_modes_for_orders' => ['delivery']]);
    $menu = RestaurantMenu::factory()->for($restaurant)->create();
    $item = MenuItem::factory()->for($restaurant)->create(['menu_id' => $menu->id, 'price' => 1000]);
    $owner = ownerOf($restaurant);

    $takeawayOrder = $restaurant->orders()->create([
        'fulfillment_type' => 'takeaway', 'customer_name' => 'X', 'customer_phone' => '900',
        'pickup_asap' => true, 'status' => 'pending', 'subtotal' => 1000, 'total' => 1000,
    ]);
    $deliveryOrder = $restaurant->orders()->create([
        'fulfillment_type' => 'delivery', 'customer_name' => 'X', 'customer_phone' => '900',
        'status' => 'pending', 'subtotal' => 1000, 'total' => 1500,
    ]);

    $this->actingAs($owner, 'sanctum')
        ->patchJson("/api/v1/orders/{$takeawayOrder->uuid}/accept", ['payment_method_code' => 'cash'])
        ->assertOk()->assertJsonPath('data.cautionRequired', null);

    $this->actingAs($owner, 'sanctum')
        ->patchJson("/api/v1/orders/{$deliveryOrder->uuid}/accept", ['payment_method_code' => 'cash'])
        ->assertOk()->assertJsonPath('data.cautionRequired', 3000);
});

test('accept rejeita método de pagamento que o restaurante não aceita', function () {
    $restaurant = createOrderableRestaurant();
    $owner = ownerOf($restaurant);
    $order = $restaurant->orders()->create([
        'fulfillment_type' => 'takeaway', 'customer_name' => 'X', 'customer_phone' => '900',
        'pickup_asap' => true, 'status' => 'pending', 'subtotal' => 1000, 'total' => 1000,
    ]);

    $this->actingAs($owner, 'sanctum')
        ->patchJson("/api/v1/orders/{$order->uuid}/accept", ['payment_method_code' => 'bank_transfer'])
        ->assertStatus(422);
});

test('staff de outro restaurante não consegue aceitar o pedido', function () {
    $restaurant = createOrderableRestaurant();
    $otherRestaurant = createOrderableRestaurant();
    $otherOwner = ownerOf($otherRestaurant);
    $order = $restaurant->orders()->create([
        'fulfillment_type' => 'takeaway', 'customer_name' => 'X', 'customer_phone' => '900',
        'pickup_asap' => true, 'status' => 'pending', 'subtotal' => 1000, 'total' => 1000,
    ]);

    $this->actingAs($otherOwner, 'sanctum')
        ->patchJson("/api/v1/orders/{$order->uuid}/accept", ['payment_method_code' => 'cash'])
        ->assertForbidden();
});

test('transições de estado seguem a máquina certa (delivery: accepted -> on_the_way -> delivered)', function () {
    $restaurant = createOrderableRestaurant();
    $owner = ownerOf($restaurant);
    $courier = Courier::factory()->for($restaurant)->create();
    $order = $restaurant->orders()->create([
        'fulfillment_type' => 'delivery', 'customer_name' => 'X', 'customer_phone' => '900',
        'status' => 'accepted', 'subtotal' => 1000, 'total' => 1500,
    ]);

    // pending->ready não é válido para delivery
    $this->actingAs($owner, 'sanctum')
        ->patchJson("/api/v1/orders/{$order->uuid}/status", ['status' => 'ready'])
        ->assertStatus(422);

    // accepted->on_the_way não existe mais neste endpoint genérico — só via
    // dispatch (ver DispatchOrderRequest/CourierTest para a cobertura disso).
    $this->actingAs($owner, 'sanctum')
        ->patchJson("/api/v1/orders/{$order->uuid}/status", ['status' => 'on_the_way'])
        ->assertStatus(422);

    $this->actingAs($owner, 'sanctum')
        ->patchJson("/api/v1/orders/{$order->uuid}/dispatch", ['courier_id' => $courier->uuid])
        ->assertOk()->assertJsonPath('data.status', 'on_the_way');
    expect($courier->fresh())->status->toBe('em_entrega')->active_order_id->toBe($order->id);

    // Estafeta a caminho fica visível ao cliente (ver OrderResource.courier).
    $this->actingAs($owner, 'sanctum')
        ->getJson("/api/v1/orders/{$order->uuid}")
        ->assertOk()->assertJsonPath('data.courier.name', $courier->name);

    $this->actingAs($owner, 'sanctum')
        ->patchJson("/api/v1/orders/{$order->uuid}/status", ['status' => 'delivered'])
        ->assertOk()->assertJsonPath('data.status', 'delivered');
    expect($order->fresh()->delivered_at)->not->toBeNull();
    // Entregue -> estafeta libertado automaticamente (OrderObserver).
    expect($courier->fresh())->status->toBe('disponivel')->active_order_id->toBeNull();
});

test('restaurante emite a fatura do pedido (imagem ou PDF), cliente convidado consegue ver o link', function () {
    Storage::fake('r2', ['url' => 'https://cdn.luku.com']);
    $restaurant = createOrderableRestaurant();
    $owner = ownerOf($restaurant);
    $order = $restaurant->orders()->create([
        'fulfillment_type' => 'takeaway', 'customer_name' => 'X', 'customer_phone' => '900',
        'pickup_asap' => true, 'status' => 'accepted', 'subtotal' => 1000, 'total' => 1000,
        'guest_token' => Str::uuid(),
    ]);

    $file = UploadedFile::fake()->create('fatura.pdf', 200, 'application/pdf');

    $this->actingAs($owner, 'sanctum')
        ->postJson("/api/v1/orders/{$order->uuid}/invoice", ['invoice' => $file, 'type' => 'nif'])
        ->assertOk()
        ->assertJsonPath('data.invoiceType', 'nif')
        ->assertJsonPath('data.invoiceUrl', fn ($url) => str_contains($url, '.pdf'));

    expect($order->fresh()->invoice_at)->not->toBeNull();

    $this->withHeader('X-Guest-Token', (string) $order->guest_token)
        ->getJson("/api/v1/orders/{$order->uuid}")
        ->assertOk()
        ->assertJsonPath('data.invoiceType', 'nif');
});

test('staff de outro restaurante não consegue emitir fatura', function () {
    $restaurant = createOrderableRestaurant();
    $otherRestaurant = createOrderableRestaurant();
    $otherOwner = ownerOf($otherRestaurant);
    $order = $restaurant->orders()->create([
        'fulfillment_type' => 'takeaway', 'customer_name' => 'X', 'customer_phone' => '900',
        'pickup_asap' => true, 'status' => 'accepted', 'subtotal' => 1000, 'total' => 1000,
    ]);
    $file = UploadedFile::fake()->create('fatura.pdf', 200, 'application/pdf');

    $this->actingAs($otherOwner, 'sanctum')
        ->postJson("/api/v1/orders/{$order->uuid}/invoice", ['invoice' => $file])
        ->assertForbidden();
});

test('cliente só cancela o próprio pedido enquanto pending', function () {
    $restaurant = createOrderableRestaurant();
    $order = $restaurant->orders()->create([
        'fulfillment_type' => 'takeaway', 'customer_name' => 'X', 'customer_phone' => '900',
        'pickup_asap' => true, 'status' => 'accepted', 'subtotal' => 1000, 'total' => 1000,
        'guest_token' => Str::uuid(),
    ]);

    $this->withHeader('X-Guest-Token', (string) $order->guest_token)
        ->postJson("/api/v1/orders/{$order->uuid}/cancel")
        ->assertStatus(422); // já não é "pending"
});

// --- guest_token isolamento (foco explícito de revisão) ---

test('convidado com o token certo vê o próprio pedido', function () {
    $restaurant = createOrderableRestaurant();
    $order = $restaurant->orders()->create([
        'fulfillment_type' => 'takeaway', 'customer_name' => 'X', 'customer_phone' => '900',
        'pickup_asap' => true, 'status' => 'pending', 'subtotal' => 1000, 'total' => 1000,
        'guest_token' => Str::uuid(),
    ]);

    $this->withHeader('X-Guest-Token', (string) $order->guest_token)
        ->getJson("/api/v1/orders/{$order->uuid}")
        ->assertOk();
});

test('convidado SEM token (ou com o token de outro pedido) não vê o pedido — 404, não 403', function () {
    $restaurant = createOrderableRestaurant();
    $order = $restaurant->orders()->create([
        'fulfillment_type' => 'takeaway', 'customer_name' => 'X', 'customer_phone' => '900',
        'pickup_asap' => true, 'status' => 'pending', 'subtotal' => 1000, 'total' => 1000,
        'guest_token' => Str::uuid(),
    ]);
    $otherOrder = $restaurant->orders()->create([
        'fulfillment_type' => 'takeaway', 'customer_name' => 'Y', 'customer_phone' => '901',
        'pickup_asap' => true, 'status' => 'pending', 'subtotal' => 1000, 'total' => 1000,
        'guest_token' => Str::uuid(),
    ]);

    // sem token nenhum
    $this->getJson("/api/v1/orders/{$order->uuid}")->assertStatus(404);

    // token de OUTRO pedido — não deve "vazar" acesso por engano
    $this->withHeader('X-Guest-Token', (string) $otherOrder->guest_token)
        ->getJson("/api/v1/orders/{$order->uuid}")
        ->assertStatus(404);
});

test('customer autenticado só vê os próprios pedidos, não os de outro user', function () {
    $restaurant = createOrderableRestaurant();
    $owner = User::factory()->create();
    $intruder = User::factory()->create();
    $order = $restaurant->orders()->create([
        'user_id' => $owner->id,
        'fulfillment_type' => 'takeaway', 'customer_name' => 'X', 'customer_phone' => '900',
        'pickup_asap' => true, 'status' => 'pending', 'subtotal' => 1000, 'total' => 1000,
    ]);

    $this->actingAs($intruder, 'sanctum')->getJson("/api/v1/orders/{$order->uuid}")->assertStatus(404);
    $this->actingAs($owner, 'sanctum')->getJson("/api/v1/orders/{$order->uuid}")->assertOk();
});

// --- comprovativo de pagamento em PDF (regressão: só imagem funcionava) ---

test('cliente consegue anexar comprovativo de pagamento em PDF, não só imagem', function () {
    Storage::fake('r2', ['url' => 'https://cdn.luku.com']);
    $restaurant = createOrderableRestaurant();
    $order = $restaurant->orders()->create([
        'fulfillment_type' => 'takeaway', 'customer_name' => 'X', 'customer_phone' => '900',
        'pickup_asap' => true, 'status' => 'accepted', 'payment_method_code' => 'multicaixa_express',
        'subtotal' => 1000, 'total' => 1000, 'guest_token' => Str::uuid(),
    ]);

    $file = UploadedFile::fake()->create('comprovativo.pdf', 200, 'application/pdf');

    $this->withHeader('X-Guest-Token', (string) $order->guest_token)
        ->postJson("/api/v1/orders/{$order->uuid}/payment-proof", ['proof' => $file])
        ->assertOk()
        ->assertJsonPath('data.paymentProofUrl', fn ($url) => str_contains($url, '.pdf'));

    expect($order->fresh()->payment_proof_at)->not->toBeNull();
});

// --- destino do pagamento visível ao cliente (regressão: dados ficavam atrás de endpoint staff-only) ---

test('cliente vê a conta/número do método de pagamento já exigido no seu pedido', function () {
    $restaurant = createOrderableRestaurant();
    $restaurant->paymentDetails()->create([
        'payment_method_code' => 'multicaixa_express',
        'details' => '923 000 111',
    ]);
    $order = $restaurant->orders()->create([
        'fulfillment_type' => 'takeaway', 'customer_name' => 'X', 'customer_phone' => '900',
        'pickup_asap' => true, 'status' => 'accepted', 'payment_method_code' => 'multicaixa_express',
        'subtotal' => 1000, 'total' => 1000, 'guest_token' => Str::uuid(),
    ]);

    $this->withHeader('X-Guest-Token', (string) $order->guest_token)
        ->getJson("/api/v1/orders/{$order->uuid}")
        ->assertOk()
        ->assertJsonPath('data.paymentDestination', '923 000 111');
});

test('destino do pagamento nunca mistura com outro método configurado no mesmo restaurante', function () {
    $restaurant = createOrderableRestaurant();
    $restaurant->paymentDetails()->create(['payment_method_code' => 'multicaixa_express', 'details' => '923 000 111']);
    $restaurant->paymentDetails()->create(['payment_method_code' => 'cash', 'details' => 'não deveria aparecer aqui']);
    $order = $restaurant->orders()->create([
        'fulfillment_type' => 'takeaway', 'customer_name' => 'X', 'customer_phone' => '900',
        'pickup_asap' => true, 'status' => 'accepted', 'payment_method_code' => 'multicaixa_express',
        'subtotal' => 1000, 'total' => 1000, 'guest_token' => Str::uuid(),
    ]);

    $this->withHeader('X-Guest-Token', (string) $order->guest_token)
        ->getJson("/api/v1/orders/{$order->uuid}")
        ->assertOk()
        ->assertJsonPath('data.paymentDestination', '923 000 111');
});
