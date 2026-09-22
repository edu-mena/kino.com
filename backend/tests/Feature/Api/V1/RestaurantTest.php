<?php

use App\Models\MenuItem;
use App\Models\PaymentMethod;
use App\Models\Restaurant;
use App\Models\RestaurantMenu;
use App\Models\RestaurantSubscription;
use App\Models\User;
use Database\Seeders\PaymentMethodSeeder;

test('listagem pública de restaurantes não precisa de auth', function () {
    Restaurant::factory()->count(3)->create();

    $this->getJson('/api/v1/restaurants')->assertOk()->assertJsonCount(3, 'data');
});

test('filtro por cidade só devolve restaurantes daquela cidade', function () {
    Restaurant::factory()->create(['city' => 'Luanda']);
    Restaurant::factory()->create(['city' => 'Benguela']);

    $response = $this->getJson('/api/v1/restaurants?filter[city]=Benguela');

    $response->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.city', 'Benguela');
});

test('listagem cacheada não fica desatualizada depois de um update (invalidação por geração)', function () {
    $restaurant = Restaurant::factory()->create(['name' => 'Nome Antigo']);
    $operator = User::factory()->systemOperator()->create();

    $this->getJson('/api/v1/restaurants')->assertJsonPath('data.0.name', 'Nome Antigo');

    $this->actingAs($operator, 'sanctum')
        ->patchJson("/api/v1/restaurants/{$restaurant->uuid}", ['name' => 'Nome Novo'])
        ->assertOk();

    $this->getJson('/api/v1/restaurants')->assertJsonPath('data.0.name', 'Nome Novo');
});

test('listagem e detalhe públicos expõem isSuspended, nunca plano/valores/datas de pagamento', function () {
    $restaurant = Restaurant::factory()->create();
    RestaurantSubscription::query()->create([
        'restaurant_id' => $restaurant->id,
        'plan' => 'luku',
        'started_at' => now(),
        'trial_ends_at' => now()->addDays(60),
        'status' => 'suspended',
    ]);

    $index = $this->getJson('/api/v1/restaurants');
    $index->assertOk()->assertJsonPath('data.0.isSuspended', true);
    expect($index->json('data.0'))
        ->not->toHaveKeys(['plan', 'trialEndsAt', 'lastPaymentAt', 'status', 'locked']);

    $show = $this->getJson("/api/v1/restaurants/{$restaurant->uuid}");
    $show->assertOk()->assertJsonPath('data.isSuspended', true);
    expect($show->json('data'))
        ->not->toHaveKeys(['plan', 'trialEndsAt', 'lastPaymentAt', 'status', 'locked']);
});

test('restaurante sem subscrição aparece como não suspenso (nunca crasha)', function () {
    Restaurant::factory()->create();

    $this->getJson('/api/v1/restaurants')->assertOk()->assertJsonPath('data.0.isSuspended', false);
});

test('suspender/reativar a subscrição invalida a cache da listagem pública', function () {
    $restaurant = Restaurant::factory()->create();
    $subscription = RestaurantSubscription::query()->create([
        'restaurant_id' => $restaurant->id,
        'plan' => 'luku',
        'started_at' => now(),
        'trial_ends_at' => now()->addDays(60),
        'status' => 'active',
    ]);
    $operator = User::factory()->systemOperator()->create();

    $this->getJson('/api/v1/restaurants')->assertJsonPath('data.0.isSuspended', false);

    $this->actingAs($operator, 'sanctum')
        ->patchJson("/api/v1/restaurants/{$restaurant->uuid}/subscription", ['status' => 'suspended'])
        ->assertOk();

    $this->getJson('/api/v1/restaurants')->assertJsonPath('data.0.isSuspended', true);
});

test('customer não pode criar restaurante (só system_operator)', function () {
    $customer = User::factory()->create();

    $this->actingAs($customer, 'sanctum')
        ->postJson('/api/v1/restaurants', ['name' => 'Novo Restaurante'])
        ->assertForbidden();
});

test('staff de um restaurante não consegue editar outro restaurante (cross-tenant)', function () {
    $ownRestaurant = Restaurant::factory()->create();
    $otherRestaurant = Restaurant::factory()->create(['name' => 'Original']);

    $staff = User::factory()->restaurantStaff()->create();
    $staff->restaurantUsers()->create(['restaurant_id' => $ownRestaurant->id, 'role_in_restaurant' => 'owner']);

    $this->actingAs($staff, 'sanctum')
        ->patchJson("/api/v1/restaurants/{$otherRestaurant->uuid}", ['name' => 'Hackeado'])
        ->assertForbidden();

    expect($otherRestaurant->fresh()->name)->toBe('Original');
});

test('atualizar horário substitui os 7 dias numa transação', function () {
    $restaurant = Restaurant::factory()->create();
    $operator = User::factory()->systemOperator()->create();

    $days = collect(range(0, 6))->map(fn ($weekday) => [
        'weekday' => $weekday,
        'is_open' => $weekday !== 0,
        'ranges' => $weekday === 0 ? [] : [['start_time' => '10:00', 'end_time' => '22:00']],
    ])->all();

    $response = $this->actingAs($operator, 'sanctum')
        ->putJson("/api/v1/restaurants/{$restaurant->uuid}/hours", ['days' => $days]);

    $response->assertOk();
    expect($restaurant->hours()->count())->toBe(7);
    expect($restaurant->hours()->where('weekday', 0)->first()->is_open)->toBeFalse();
    expect($restaurant->hours()->where('weekday', 1)->first()->ranges()->count())->toBe(1);
});

test('manager pode editar dados gerais mas não campos de política de negócio (fulfillment/pagamento/caução)', function () {
    $restaurant = Restaurant::factory()->create(['name' => 'Original']);
    $manager = User::factory()->restaurantStaff()->create();
    $manager->restaurantUsers()->create(['restaurant_id' => $restaurant->id, 'role_in_restaurant' => 'manager']);

    // Campo "normal" — permitido.
    $this->actingAs($manager, 'sanctum')
        ->patchJson("/api/v1/restaurants/{$restaurant->uuid}", ['name' => 'Nome Editado'])
        ->assertOk();

    // Campos de política de negócio — bloqueados, mesmo sendo staff do
    // próprio restaurante (não é cross-tenant, é falta de confiança de role).
    $this->actingAs($manager, 'sanctum')
        ->patchJson("/api/v1/restaurants/{$restaurant->uuid}", ['fulfillment_modes' => ['delivery']])
        ->assertForbidden();

    $this->actingAs($manager, 'sanctum')
        ->patchJson("/api/v1/restaurants/{$restaurant->uuid}", ['caution_amount' => 5000])
        ->assertForbidden();

    expect($restaurant->fresh())
        ->name->toBe('Nome Editado')
        ->caution_amount->toEqual(0);
});

test('owner atualiza a imagem de capa do restaurante', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);

    $this->actingAs($owner, 'sanctum')
        ->patchJson("/api/v1/restaurants/{$restaurant->uuid}", [
            'cover_image_url' => 'https://cdn.luku.ao/covers/novo.jpg',
        ])
        ->assertOk()
        ->assertJsonPath('data.coverImageUrl', 'https://cdn.luku.ao/covers/novo.jpg');
});

test('owner consegue editar campos de política de negócio', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);

    $this->actingAs($owner, 'sanctum')
        ->patchJson("/api/v1/restaurants/{$restaurant->uuid}", [
            'fulfillment_modes' => ['delivery', 'takeaway'],
            'caution_amount' => 5000,
        ])
        ->assertOk();

    expect($restaurant->fresh())
        ->fulfillment_modes->toBe(['delivery', 'takeaway'])
        ->caution_amount->toEqual(5000);
});

test('só o owner consegue atualizar payment-details, manager não', function () {
    $restaurant = Restaurant::factory()->create();
    $manager = User::factory()->restaurantStaff()->create();
    $manager->restaurantUsers()->create(['restaurant_id' => $restaurant->id, 'role_in_restaurant' => 'manager']);

    $this->actingAs($manager, 'sanctum')
        ->putJson("/api/v1/restaurants/{$restaurant->uuid}/payment-details", [
            'details' => [['payment_method_code' => 'cash', 'details' => 'Pagamento à entrega']],
        ])
        ->assertForbidden();
});

test('manager consegue LER payment-details (só escrever é owner-only)', function () {
    PaymentMethod::query()->firstOrCreate(['code' => 'cash'], ['name' => 'Numerário', 'is_digital' => false, 'position' => 1]);
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);
    $manager = User::factory()->restaurantStaff()->create();
    $manager->restaurantUsers()->create(['restaurant_id' => $restaurant->id, 'role_in_restaurant' => 'manager']);

    $this->actingAs($owner, 'sanctum')->putJson("/api/v1/restaurants/{$restaurant->uuid}/payment-details", [
        'details' => [['payment_method_code' => 'cash', 'details' => 'Pagamento à entrega']],
    ])->assertOk();

    $this->actingAs($manager, 'sanctum')
        ->getJson("/api/v1/restaurants/{$restaurant->uuid}/payment-details")
        ->assertOk()
        ->assertJsonFragment(['payment_method_code' => 'cash', 'details' => 'Pagamento à entrega']);
});

/**
 * Regressão de um bug real: os 7 códigos aqui (usados pelo seeder de
 * produção, PaymentMethodSeeder) e os 7 ids em src/lib/mock-data.ts têm de
 * bater exatamente — não há endpoint que devolva o catálogo real, os dois
 * lados são hardcoded e ficaram dessincronizados (ex: "kwik" no frontend
 * vs "kwik_bfa" aqui, "transferencia" vs "bank_transfer") — o admin via
 * "payment_method_code is invalid" ao tentar guardar QUALQUER método
 * exceto numerário (o único que já batia por coincidência).
 */
test('todos os métodos de pagamento do catálogo (PaymentMethodSeeder) são aceites', function () {
    (new PaymentMethodSeeder)->run();
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);

    // Mesmos 7 ids de src/lib/mock-data.ts (paymentMethods) — mantém os
    // dois lados em sincronia; se um mudar sem o outro, este teste falha.
    $codes = [
        'multicaixa_express',
        'kwik_bfa',
        'bai_directo',
        'paypay_ao',
        'unitel_money',
        'bank_transfer',
        'cash',
    ];

    $response = $this->actingAs($owner, 'sanctum')->putJson(
        "/api/v1/restaurants/{$restaurant->uuid}/payment-details",
        ['details' => collect($codes)->map(fn ($code) => [
            'payment_method_code' => $code,
            'details' => "Detalhe de {$code}",
        ])->all()],
    );

    $response->assertOk();
    $returnedCodes = collect($response->json('data'))->pluck('payment_method_code')->all();
    expect($returnedCodes)->toEqualCanonicalizing($codes);
});

test('owner atualiza o wallpaper do restaurante', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);

    $this->actingAs($owner, 'sanctum')
        ->patchJson("/api/v1/restaurants/{$restaurant->uuid}", [
            'wallpaper_url' => 'https://cdn.luku.ao/wallpapers/novo.jpg',
        ])
        ->assertOk()
        ->assertJsonPath('data.wallpaperUrl', 'https://cdn.luku.ao/wallpapers/novo.jpg');
});

test('price_level do restaurante recalcula quando o preço de um prato muda', function () {
    $restaurant = Restaurant::factory()->create();
    $menu = RestaurantMenu::factory()->for($restaurant)->create();
    $item = MenuItem::factory()->for($restaurant)->create(['menu_id' => $menu->id, 'price' => 1000]);

    expect($restaurant->fresh()->price_level)->toBe(1); // faixa mais barata

    $item->update(['price' => 20000]);

    expect($restaurant->fresh()->price_level)->toBe(4); // faixa mais cara
});

test('price_level volta a null quando o restaurante fica sem pratos disponíveis', function () {
    $restaurant = Restaurant::factory()->create();
    $menu = RestaurantMenu::factory()->for($restaurant)->create();
    $item = MenuItem::factory()->for($restaurant)->create(['menu_id' => $menu->id, 'price' => 1000]);

    expect($restaurant->fresh()->price_level)->not->toBeNull();

    $item->delete();

    expect($restaurant->fresh()->price_level)->toBeNull();
});
