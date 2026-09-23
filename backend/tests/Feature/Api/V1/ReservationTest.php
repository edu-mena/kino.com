<?php

use App\Models\Offer;
use App\Models\Restaurant;
use App\Models\RestaurantTable;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

function createReservableRestaurant(array $attrs = []): Restaurant
{
    return Restaurant::factory()->create(array_merge([
        'accepts_reservations' => true,
        'reservation_slot_minutes' => 120,
        'caution_amount' => 0,
    ], $attrs));
}

test('convidado cria reserva sem autenticação e recebe guest_token uma única vez', function () {
    $restaurant = createReservableRestaurant();

    $response = $this->postJson("/api/v1/restaurants/{$restaurant->uuid}/reservations", [
        'customer_name' => 'Ana', 'customer_phone' => '923000000',
        'date' => now()->addDay()->toDateString(), 'time' => '19:30', 'people_count' => 4,
    ], ['Idempotency-Key' => Str::uuid()->toString()]);

    $response->assertStatus(201)
        ->assertJsonPath('data.status', 'pending')
        ->assertJsonPath('data.peopleCount', 4);
    expect($response->json('data.guestToken'))->not->toBeNull();
});

test('cliente vê as próprias reservas de vários restaurantes, com nome/imagem do restaurante', function () {
    $restaurantA = createReservableRestaurant();
    $restaurantB = createReservableRestaurant();
    $customer = User::factory()->create();
    $other = User::factory()->create();

    $restaurantA->reservations()->create([
        'user_id' => $customer->id, 'customer_name' => 'Ana', 'customer_phone' => '900',
        'date' => now()->addDay()->toDateString(), 'time' => '19:00',
        'people_count' => 2, 'status' => 'pending', 'status_updated_at' => now(),
    ]);
    $restaurantB->reservations()->create([
        'user_id' => $customer->id, 'customer_name' => 'Ana', 'customer_phone' => '900',
        'date' => now()->addDay()->toDateString(), 'time' => '20:00',
        'people_count' => 3, 'status' => 'pending', 'status_updated_at' => now(),
    ]);
    $restaurantA->reservations()->create([
        'user_id' => $other->id, 'customer_name' => 'Outro', 'customer_phone' => '901',
        'date' => now()->addDay()->toDateString(), 'time' => '18:00',
        'people_count' => 1, 'status' => 'pending', 'status_updated_at' => now(),
    ]);

    $response = $this->actingAs($customer, 'sanctum')->getJson('/api/v1/reservations');

    $response->assertOk()->assertJsonCount(2, 'data');
    expect($response->json('data.0.restaurantName'))->not->toBeNull();
});

test('reserva nunca chega com table_id — atribuição é sempre ação separada do staff', function () {
    $restaurant = createReservableRestaurant();

    $response = $this->postJson("/api/v1/restaurants/{$restaurant->uuid}/reservations", [
        'customer_name' => 'Ana', 'customer_phone' => '900',
        'date' => now()->addDay()->toDateString(), 'time' => '19:30', 'people_count' => 2,
        'table_id' => 999999, // tentativa de injetar — deve ser ignorado (campo nem existe no request)
    ], ['Idempotency-Key' => Str::uuid()->toString()]);

    $response->assertStatus(201)->assertJsonPath('data.tableId', null);
});

test('caução da reserva é sempre o valor configurado do restaurante, sem "modo" (só presencial existe)', function () {
    $restaurant = createReservableRestaurant(['caution_amount' => 5000]);

    $response = $this->postJson("/api/v1/restaurants/{$restaurant->uuid}/reservations", [
        'customer_name' => 'Ana', 'customer_phone' => '900',
        'date' => now()->addDay()->toDateString(), 'time' => '19:30', 'people_count' => 2,
    ], ['Idempotency-Key' => Str::uuid()->toString()]);

    $response->assertStatus(201)
        ->assertJsonPath('data.cautionAmount', 5000)
        ->assertJsonPath('data.cautionStatus', 'pending');
});

test('reserva NÃO é bloqueada por sobreposição — decisão de produto deliberada (ver ReservationOccupancyService)', function () {
    $restaurant = createReservableRestaurant();
    $date = now()->addDay()->toDateString();

    $first = $this->postJson("/api/v1/restaurants/{$restaurant->uuid}/reservations", [
        'customer_name' => 'A', 'customer_phone' => '900', 'date' => $date, 'time' => '19:00', 'people_count' => 4,
    ], ['Idempotency-Key' => Str::uuid()->toString()]);
    $second = $this->postJson("/api/v1/restaurants/{$restaurant->uuid}/reservations", [
        'customer_name' => 'B', 'customer_phone' => '901', 'date' => $date, 'time' => '19:30', 'people_count' => 4,
    ], ['Idempotency-Key' => Str::uuid()->toString()]);

    // As duas passam — não há rejeição por conflito de horário/capacidade.
    $first->assertStatus(201);
    $second->assertStatus(201);
    expect($restaurant->reservations()->count())->toBe(2);
});

test('listagem de staff sinaliza sobreposição (occupancy) sem impedir nada', function () {
    $restaurant = createReservableRestaurant(['reservation_slot_minutes' => 120]);
    RestaurantTable::factory()->for($restaurant)->create(['seats' => 4]);
    $owner = ownerOf($restaurant);
    $date = now()->addDay()->toDateString();

    $restaurant->reservations()->create([
        'customer_name' => 'A', 'customer_phone' => '900', 'date' => $date, 'time' => '19:00',
        'people_count' => 4, 'status' => 'pending', 'status_updated_at' => now(),
    ]);
    $restaurant->reservations()->create([
        'customer_name' => 'B', 'customer_phone' => '901', 'date' => $date, 'time' => '19:30', // dentro da janela de 120min
        'people_count' => 4, 'status' => 'pending', 'status_updated_at' => now(),
    ]);

    $response = $this->actingAs($owner, 'sanctum')
        ->getJson("/api/v1/restaurants/{$restaurant->uuid}/reservations");

    $response->assertOk();
    // As duas juntas (8 pessoas) excedem a única mesa (4 lugares) -> overbooked.
    expect($response->json('data.0.occupancy.overbooked'))->toBeTrue();
});

test('staff confirma reserva pending -> confirmed; cliente não pode pular direto para confirmed', function () {
    $restaurant = createReservableRestaurant();
    $owner = ownerOf($restaurant);
    $reservation = $restaurant->reservations()->create([
        'customer_name' => 'A', 'customer_phone' => '900',
        'date' => now()->addDay()->toDateString(), 'time' => '19:00',
        'people_count' => 2, 'status' => 'pending', 'status_updated_at' => now(),
    ]);

    $this->actingAs($owner, 'sanctum')
        ->patchJson("/api/v1/reservations/{$reservation->uuid}/status", ['status' => 'confirmed'])
        ->assertOk()->assertJsonPath('data.status', 'confirmed');

    // confirmed -> confirmed de novo não é uma transição válida
    $this->actingAs($owner, 'sanctum')
        ->patchJson("/api/v1/reservations/{$reservation->uuid}/status", ['status' => 'confirmed'])
        ->assertStatus(422);
});

test('confirmed só pode ir para voided, não direto para declined', function () {
    $restaurant = createReservableRestaurant();
    $owner = ownerOf($restaurant);
    $reservation = $restaurant->reservations()->create([
        'customer_name' => 'A', 'customer_phone' => '900',
        'date' => now()->addDay()->toDateString(), 'time' => '19:00',
        'people_count' => 2, 'status' => 'confirmed', 'status_updated_at' => now(),
    ]);

    $this->actingAs($owner, 'sanctum')
        ->patchJson("/api/v1/reservations/{$reservation->uuid}/status", ['status' => 'declined'])
        ->assertStatus(422);

    $this->actingAs($owner, 'sanctum')
        ->patchJson("/api/v1/reservations/{$reservation->uuid}/status", ['status' => 'voided'])
        ->assertOk();
});

test('atribuir mesa não bloqueia por sobreposição — staff decide livremente', function () {
    $restaurant = createReservableRestaurant();
    $table = RestaurantTable::factory()->for($restaurant)->create();
    $owner = ownerOf($restaurant);
    $date = now()->addDay()->toDateString();

    $a = $restaurant->reservations()->create([
        'customer_name' => 'A', 'customer_phone' => '900', 'date' => $date, 'time' => '19:00',
        'people_count' => 2, 'status' => 'pending', 'status_updated_at' => now(),
    ]);
    $b = $restaurant->reservations()->create([
        'customer_name' => 'B', 'customer_phone' => '901', 'date' => $date, 'time' => '19:15',
        'people_count' => 2, 'status' => 'pending', 'status_updated_at' => now(),
    ]);

    $this->actingAs($owner, 'sanctum')
        ->patchJson("/api/v1/reservations/{$a->uuid}/table", ['table_id' => $table->uuid])
        ->assertOk();

    // Mesma mesa, janela sobreposta — o servidor deixa (staff resolve manualmente).
    $this->actingAs($owner, 'sanctum')
        ->patchJson("/api/v1/reservations/{$b->uuid}/table", ['table_id' => $table->uuid])
        ->assertOk();
});

test('mesa de outro restaurante é rejeitada ao atribuir', function () {
    $restaurant = createReservableRestaurant();
    $otherRestaurant = createReservableRestaurant();
    $foreignTable = RestaurantTable::factory()->for($otherRestaurant)->create();
    $owner = ownerOf($restaurant);
    $reservation = $restaurant->reservations()->create([
        'customer_name' => 'A', 'customer_phone' => '900',
        'date' => now()->addDay()->toDateString(), 'time' => '19:00',
        'people_count' => 2, 'status' => 'pending', 'status_updated_at' => now(),
    ]);

    $this->actingAs($owner, 'sanctum')
        ->patchJson("/api/v1/reservations/{$reservation->uuid}/table", ['table_id' => $foreignTable->uuid])
        ->assertStatus(422);
});

test('convidado com token certo cancela a própria reserva pending; token errado é 404', function () {
    $restaurant = createReservableRestaurant();
    $reservation = $restaurant->reservations()->create([
        'customer_name' => 'A', 'customer_phone' => '900',
        'date' => now()->addDay()->toDateString(), 'time' => '19:00',
        'people_count' => 2, 'status' => 'pending', 'status_updated_at' => now(),
        'guest_token' => Str::uuid(),
    ]);

    $this->postJson("/api/v1/reservations/{$reservation->uuid}/cancel")->assertStatus(404);

    $this->withHeader('X-Guest-Token', (string) $reservation->guest_token)
        ->postJson("/api/v1/reservations/{$reservation->uuid}/cancel")
        ->assertOk()->assertJsonPath('data.status', 'canceled');
});

test('staff de outro restaurante não gere reservas alheias', function () {
    $restaurant = createReservableRestaurant();
    $otherRestaurant = createReservableRestaurant();
    $otherOwner = ownerOf($otherRestaurant);
    $reservation = $restaurant->reservations()->create([
        'customer_name' => 'A', 'customer_phone' => '900',
        'date' => now()->addDay()->toDateString(), 'time' => '19:00',
        'people_count' => 2, 'status' => 'pending', 'status_updated_at' => now(),
    ]);

    $this->actingAs($otherOwner, 'sanctum')
        ->patchJson("/api/v1/reservations/{$reservation->uuid}/status", ['status' => 'confirmed'])
        ->assertForbidden();
});

// --- cancelamento pós-confirmação, dentro de uma janela definida pelo restaurante ---

test('cliente cancela reserva confirmada dentro da janela do restaurante', function () {
    $restaurant = createReservableRestaurant(['reservation_cancellation_window_minutes' => 30]);
    $reservation = $restaurant->reservations()->create([
        'customer_name' => 'A', 'customer_phone' => '900',
        'date' => now()->addDay()->toDateString(), 'time' => '19:00', 'people_count' => 2,
        'status' => 'confirmed', 'status_updated_at' => now()->subMinutes(10),
        'guest_token' => Str::uuid(),
    ]);

    $this->withHeader('X-Guest-Token', (string) $reservation->guest_token)
        ->postJson("/api/v1/reservations/{$reservation->uuid}/cancel")
        ->assertOk()->assertJsonPath('data.status', 'canceled');
});

test('cliente não cancela reserva confirmada depois de expirar a janela', function () {
    $restaurant = createReservableRestaurant(['reservation_cancellation_window_minutes' => 30]);
    $reservation = $restaurant->reservations()->create([
        'customer_name' => 'A', 'customer_phone' => '900',
        'date' => now()->addDay()->toDateString(), 'time' => '19:00', 'people_count' => 2,
        'status' => 'confirmed', 'status_updated_at' => now()->subMinutes(31),
        'guest_token' => Str::uuid(),
    ]);

    $this->withHeader('X-Guest-Token', (string) $reservation->guest_token)
        ->postJson("/api/v1/reservations/{$reservation->uuid}/cancel")
        ->assertStatus(422);
});

test('sem janela configurada (0), reserva confirmada não pode ser cancelada — comportamento de sempre', function () {
    $restaurant = createReservableRestaurant(['reservation_cancellation_window_minutes' => 0]);
    $reservation = $restaurant->reservations()->create([
        'customer_name' => 'A', 'customer_phone' => '900',
        'date' => now()->addDay()->toDateString(), 'time' => '19:00', 'people_count' => 2,
        'status' => 'confirmed', 'status_updated_at' => now(),
        'guest_token' => Str::uuid(),
    ]);

    $this->withHeader('X-Guest-Token', (string) $reservation->guest_token)
        ->postJson("/api/v1/reservations/{$reservation->uuid}/cancel")
        ->assertStatus(422);
});

test('cancelar dentro da janela não mexe na caução — cancelamento não é reembolso', function () {
    $restaurant = createReservableRestaurant([
        'reservation_cancellation_window_minutes' => 30,
        'caution_amount' => 5000,
    ]);
    $reservation = $restaurant->reservations()->create([
        'customer_name' => 'A', 'customer_phone' => '900',
        'date' => now()->addDay()->toDateString(), 'time' => '19:00', 'people_count' => 2,
        'status' => 'confirmed', 'status_updated_at' => now(),
        'caution_amount' => 5000, 'caution_status' => 'paid',
        'guest_token' => Str::uuid(),
    ]);

    $this->withHeader('X-Guest-Token', (string) $reservation->guest_token)
        ->postJson("/api/v1/reservations/{$reservation->uuid}/cancel")
        ->assertOk()
        ->assertJsonPath('data.status', 'canceled')
        ->assertJsonPath('data.cautionStatus', 'paid');
});

test('reserva pendente continua a poder ser cancelada sempre, independente da janela', function () {
    $restaurant = createReservableRestaurant(['reservation_cancellation_window_minutes' => 0]);
    $reservation = $restaurant->reservations()->create([
        'customer_name' => 'A', 'customer_phone' => '900',
        'date' => now()->addDay()->toDateString(), 'time' => '19:00', 'people_count' => 2,
        'status' => 'pending', 'status_updated_at' => now()->subDays(3),
        'guest_token' => Str::uuid(),
    ]);

    $this->withHeader('X-Guest-Token', (string) $reservation->guest_token)
        ->postJson("/api/v1/reservations/{$reservation->uuid}/cancel")
        ->assertOk()->assertJsonPath('data.status', 'canceled');
});

// --- comprovativo de pagamento da caução (imagem ou PDF) ---

test('cliente anexa comprovativo de pagamento da caução, imagem ou PDF', function () {
    Storage::fake('r2', ['url' => 'https://cdn.luku.com']);
    $restaurant = createReservableRestaurant(['caution_amount' => 5000]);
    $reservation = $restaurant->reservations()->create([
        'customer_name' => 'A', 'customer_phone' => '900',
        'date' => now()->addDay()->toDateString(), 'time' => '19:00', 'people_count' => 2,
        'status' => 'pending', 'status_updated_at' => now(),
        'caution_amount' => 5000, 'caution_status' => 'pending',
        'guest_token' => Str::uuid(),
    ]);

    $pdf = UploadedFile::fake()->create('comprovativo.pdf', 200, 'application/pdf');

    $this->withHeader('X-Guest-Token', (string) $reservation->guest_token)
        ->postJson("/api/v1/reservations/{$reservation->uuid}/payment-proof", ['proof' => $pdf])
        ->assertOk()
        ->assertJsonPath('data.paymentProofUrl', fn ($url) => str_contains($url, '.pdf'));

    expect($reservation->fresh()->payment_proof_at)->not->toBeNull();
});

test('convidado sem token não consegue anexar comprovativo de outra reserva', function () {
    $restaurant = createReservableRestaurant(['caution_amount' => 5000]);
    $reservation = $restaurant->reservations()->create([
        'customer_name' => 'A', 'customer_phone' => '900',
        'date' => now()->addDay()->toDateString(), 'time' => '19:00', 'people_count' => 2,
        'status' => 'pending', 'status_updated_at' => now(),
        'caution_amount' => 5000, 'caution_status' => 'pending',
        'guest_token' => Str::uuid(),
    ]);
    $image = UploadedFile::fake()->image('comprovativo.jpg');

    $this->postJson("/api/v1/reservations/{$reservation->uuid}/payment-proof", ['proof' => $image])
        ->assertStatus(404);
});

// --- "não compareceu" (no_show) e reabertura ---

test('staff não marca "não compareceu" antes da hora da reserva passar', function () {
    $restaurant = createReservableRestaurant();
    $owner = ownerOf($restaurant);
    $reservation = $restaurant->reservations()->create([
        'customer_name' => 'A', 'customer_phone' => '900',
        'date' => now()->addDay()->toDateString(), 'time' => '19:00',
        'people_count' => 2, 'status' => 'confirmed', 'status_updated_at' => now(),
    ]);

    $this->actingAs($owner, 'sanctum')
        ->patchJson("/api/v1/reservations/{$reservation->uuid}/status", ['status' => 'no_show'])
        ->assertStatus(422);
});

test('staff marca "não compareceu" depois da hora da reserva já ter passado', function () {
    $restaurant = createReservableRestaurant();
    $owner = ownerOf($restaurant);
    $reservation = $restaurant->reservations()->create([
        'customer_name' => 'A', 'customer_phone' => '900',
        'date' => now()->subDay()->toDateString(), 'time' => '19:00',
        'people_count' => 2, 'status' => 'confirmed', 'status_updated_at' => now()->subDay(),
    ]);

    $this->actingAs($owner, 'sanctum')
        ->patchJson("/api/v1/reservations/{$reservation->uuid}/status", ['status' => 'no_show'])
        ->assertOk()->assertJsonPath('data.status', 'no_show');
});

test('staff reabre reserva recusada ou anulada, de volta para pendente', function () {
    $restaurant = createReservableRestaurant();
    $owner = ownerOf($restaurant);
    $declined = $restaurant->reservations()->create([
        'customer_name' => 'A', 'customer_phone' => '900',
        'date' => now()->addDay()->toDateString(), 'time' => '19:00',
        'people_count' => 2, 'status' => 'declined', 'status_updated_at' => now(),
    ]);
    $voided = $restaurant->reservations()->create([
        'customer_name' => 'B', 'customer_phone' => '901',
        'date' => now()->addDay()->toDateString(), 'time' => '20:00',
        'people_count' => 2, 'status' => 'voided', 'status_updated_at' => now(),
    ]);

    $this->actingAs($owner, 'sanctum')
        ->patchJson("/api/v1/reservations/{$declined->uuid}/status", ['status' => 'pending'])
        ->assertOk()->assertJsonPath('data.status', 'pending');

    $this->actingAs($owner, 'sanctum')
        ->patchJson("/api/v1/reservations/{$voided->uuid}/status", ['status' => 'pending'])
        ->assertOk()->assertJsonPath('data.status', 'pending');
});

// --- fatura da reserva (staff) ---

test('staff emite fatura da reserva, imagem ou PDF', function () {
    Storage::fake('r2', ['url' => 'https://cdn.luku.com']);
    $restaurant = createReservableRestaurant(['caution_amount' => 5000]);
    $owner = ownerOf($restaurant);
    $reservation = $restaurant->reservations()->create([
        'customer_name' => 'A', 'customer_phone' => '900',
        'date' => now()->subDay()->toDateString(), 'time' => '19:00', 'people_count' => 2,
        'status' => 'no_show', 'status_updated_at' => now(),
        'caution_amount' => 5000, 'caution_status' => 'paid',
    ]);

    $pdf = UploadedFile::fake()->create('fatura.pdf', 200, 'application/pdf');

    $this->actingAs($owner, 'sanctum')
        ->postJson("/api/v1/reservations/{$reservation->uuid}/invoice", ['invoice' => $pdf])
        ->assertOk()
        ->assertJsonPath('data.invoiceUrl', fn ($url) => str_contains($url, '.pdf'));

    expect($reservation->fresh()->invoice_at)->not->toBeNull();
});

test('staff de outro restaurante não emite fatura de reserva alheia', function () {
    $restaurant = createReservableRestaurant();
    $otherRestaurant = createReservableRestaurant();
    $otherOwner = ownerOf($otherRestaurant);
    $reservation = $restaurant->reservations()->create([
        'customer_name' => 'A', 'customer_phone' => '900',
        'date' => now()->subDay()->toDateString(), 'time' => '19:00', 'people_count' => 2,
        'status' => 'no_show', 'status_updated_at' => now(),
    ]);
    $image = UploadedFile::fake()->image('fatura.jpg');

    $this->actingAs($otherOwner, 'sanctum')
        ->postJson("/api/v1/reservations/{$reservation->uuid}/invoice", ['invoice' => $image])
        ->assertForbidden();
});

// --- staff confirma o pagamento da caução ---

test('staff confirma a caução pendente, passa a "paid"', function () {
    $restaurant = createReservableRestaurant(['caution_amount' => 5000]);
    $owner = ownerOf($restaurant);
    $reservation = $restaurant->reservations()->create([
        'customer_name' => 'A', 'customer_phone' => '900',
        'date' => now()->addDay()->toDateString(), 'time' => '19:00', 'people_count' => 2,
        'status' => 'confirmed', 'status_updated_at' => now(),
        'caution_amount' => 5000, 'caution_status' => 'pending',
    ]);

    $this->actingAs($owner, 'sanctum')
        ->patchJson("/api/v1/reservations/{$reservation->uuid}/caution")
        ->assertOk()
        ->assertJsonPath('data.cautionStatus', 'paid');
});

test('staff não consegue confirmar caução que já não está pendente', function () {
    $restaurant = createReservableRestaurant(['caution_amount' => 5000]);
    $owner = ownerOf($restaurant);
    $reservation = $restaurant->reservations()->create([
        'customer_name' => 'A', 'customer_phone' => '900',
        'date' => now()->addDay()->toDateString(), 'time' => '19:00', 'people_count' => 2,
        'status' => 'confirmed', 'status_updated_at' => now(),
        'caution_amount' => 5000, 'caution_status' => 'paid',
    ]);

    $this->actingAs($owner, 'sanctum')
        ->patchJson("/api/v1/reservations/{$reservation->uuid}/caution")
        ->assertStatus(422);
});

test('staff de outro restaurante não confirma caução de reserva alheia', function () {
    $restaurant = createReservableRestaurant(['caution_amount' => 5000]);
    $otherRestaurant = createReservableRestaurant();
    $otherOwner = ownerOf($otherRestaurant);
    $reservation = $restaurant->reservations()->create([
        'customer_name' => 'A', 'customer_phone' => '900',
        'date' => now()->addDay()->toDateString(), 'time' => '19:00', 'people_count' => 2,
        'status' => 'confirmed', 'status_updated_at' => now(),
        'caution_amount' => 5000, 'caution_status' => 'pending',
    ]);

    $this->actingAs($otherOwner, 'sanctum')
        ->patchJson("/api/v1/reservations/{$reservation->uuid}/caution")
        ->assertForbidden();
});

// --- código promocional aplicado à caução (Fase K2) ---

test('código promocional sem alvo desconta a caução da reserva', function () {
    $restaurant = createReservableRestaurant(['caution_amount' => 5000]);
    Offer::query()->create([
        'restaurant_id' => $restaurant->id, 'type' => 'discount', 'title' => '20% na reserva',
        'code' => 'RES20', 'percent_off' => 20, 'starts_at' => now()->subDay(),
    ]);

    $response = $this->postJson("/api/v1/restaurants/{$restaurant->uuid}/reservations", [
        'customer_name' => 'A', 'customer_phone' => '900',
        'date' => now()->addDay()->toDateString(), 'time' => '19:30', 'people_count' => 2,
        'promo_code' => 'res20',
    ], ['Idempotency-Key' => Str::uuid()->toString()]);

    $response->assertStatus(201)
        ->assertJsonPath('data.cautionAmount', 4000)
        ->assertJsonPath('data.promoCode', 'RES20')
        ->assertJsonPath('data.promoPercentOff', 20);
});

test('código promocional com prato/categoria alvo não se aplica à caução da reserva', function () {
    $restaurant = createReservableRestaurant(['caution_amount' => 5000]);
    Offer::query()->create([
        'restaurant_id' => $restaurant->id, 'type' => 'discount', 'title' => '20% num prato',
        'code' => 'PRATO20', 'percent_off' => 20, 'starts_at' => now()->subDay(),
        'target_categories' => ['Sobremesas'],
    ]);

    $response = $this->postJson("/api/v1/restaurants/{$restaurant->uuid}/reservations", [
        'customer_name' => 'A', 'customer_phone' => '900',
        'date' => now()->addDay()->toDateString(), 'time' => '19:30', 'people_count' => 2,
        'promo_code' => 'PRATO20',
    ], ['Idempotency-Key' => Str::uuid()->toString()]);

    $response->assertStatus(201)
        ->assertJsonPath('data.cautionAmount', 5000)
        ->assertJsonPath('data.promoCode', null);
});

test('código promocional de entrega grátis não se aplica à caução da reserva', function () {
    $restaurant = createReservableRestaurant(['caution_amount' => 5000]);
    Offer::query()->create([
        'restaurant_id' => $restaurant->id, 'type' => 'delivery', 'title' => 'Frete grátis',
        'code' => 'FRETE', 'starts_at' => now()->subDay(),
    ]);

    $response = $this->postJson("/api/v1/restaurants/{$restaurant->uuid}/reservations", [
        'customer_name' => 'A', 'customer_phone' => '900',
        'date' => now()->addDay()->toDateString(), 'time' => '19:30', 'people_count' => 2,
        'promo_code' => 'FRETE',
    ], ['Idempotency-Key' => Str::uuid()->toString()]);

    $response->assertStatus(201)
        ->assertJsonPath('data.cautionAmount', 5000)
        ->assertJsonPath('data.promoCode', null);
});

test('código promocional inexistente não rejeita a reserva, só não desconta nada', function () {
    $restaurant = createReservableRestaurant(['caution_amount' => 5000]);

    $response = $this->postJson("/api/v1/restaurants/{$restaurant->uuid}/reservations", [
        'customer_name' => 'A', 'customer_phone' => '900',
        'date' => now()->addDay()->toDateString(), 'time' => '19:30', 'people_count' => 2,
        'promo_code' => 'NAOEXISTE',
    ], ['Idempotency-Key' => Str::uuid()->toString()]);

    $response->assertStatus(201)
        ->assertJsonPath('data.cautionAmount', 5000)
        ->assertJsonPath('data.promoCode', null);
});

test('caução descontada até zero fica "não exige caução"', function () {
    $restaurant = createReservableRestaurant(['caution_amount' => 5000]);
    Offer::query()->create([
        'restaurant_id' => $restaurant->id, 'type' => 'discount', 'title' => '100% na reserva',
        'code' => 'GRATIS', 'percent_off' => 100, 'starts_at' => now()->subDay(),
    ]);

    $response = $this->postJson("/api/v1/restaurants/{$restaurant->uuid}/reservations", [
        'customer_name' => 'A', 'customer_phone' => '900',
        'date' => now()->addDay()->toDateString(), 'time' => '19:30', 'people_count' => 2,
        'promo_code' => 'GRATIS',
    ], ['Idempotency-Key' => Str::uuid()->toString()]);

    $response->assertStatus(201)
        ->assertJsonPath('data.cautionAmount', 0)
        ->assertJsonPath('data.cautionStatus', 'not_required');
});
