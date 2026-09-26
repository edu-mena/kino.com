<?php

use App\Models\Restaurant;
use App\Models\RestaurantSubscription;
use App\Models\User;
use App\Services\CustomerLoyaltyService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/** Inserção direta (sem observers/validação) — o que interessa aqui é a
 * contagem/soma, não o fluxo de criar pedido/reserva. */
function loyaltyOrder(Restaurant $r, array $attrs = []): void
{
    DB::table('orders')->insert(array_merge([
        'uuid' => (string) Str::uuid(),
        'restaurant_id' => $r->id,
        'fulfillment_type' => 'takeaway',
        'customer_name' => 'Ana',
        'customer_phone' => '923000000',
        'customer_email' => 'ana@example.com',
        'status' => 'completed',
        'subtotal' => 1000,
        'delivery_fee' => 0,
        'total' => 1000,
        'created_at' => now(),
        'updated_at' => now(),
    ], $attrs));
}

function loyaltyReservation(Restaurant $r, array $attrs = []): void
{
    DB::table('reservations')->insert(array_merge([
        'uuid' => (string) Str::uuid(),
        'restaurant_id' => $r->id,
        'customer_name' => 'Ana',
        'customer_phone' => '923000000',
        'customer_email' => 'ana@example.com',
        'date' => now()->subDay()->toDateString(),
        'time' => '20:00',
        'people_count' => 2,
        'status' => 'confirmed',
        'caution_amount' => 0,
        'caution_status' => 'not_required',
        'created_at' => now(),
        'updated_at' => now(),
    ], $attrs));
}

test('só o gasto conta: muitas visitas sem gasto continuam regular', function () {
    $restaurant = Restaurant::factory()->create();

    for ($i = 0; $i < 40; $i++) {
        loyaltyReservation($restaurant);
        loyaltyOrder($restaurant, ['total' => 1000]);
    }

    $row = app(CustomerLoyaltyService::class)->forRestaurant($restaurant)->first();
    expect($row)->not->toHaveKey('honoredCount')
        ->and($row['spend'])->toBe(40000.0)
        ->and($row['tier'])->toBe('regular');
});

test('Gold a partir de 500.000 Kz: pedidos com taxas mais cauções pagas', function () {
    $restaurant = Restaurant::factory()->create();

    loyaltyOrder($restaurant, ['subtotal' => 400000, 'delivery_fee' => 49999, 'total' => 449999]);
    loyaltyReservation($restaurant, ['caution_amount' => 50000, 'caution_status' => 'paid']);
    $service = app(CustomerLoyaltyService::class);
    expect($service->forRestaurant($restaurant)->first()['tier'])->toBe('regular');

    loyaltyOrder($restaurant, ['total' => 1]);
    $row = $service->forRestaurant($restaurant)->first();
    expect($row['spend'])->toBe(500000.0)->and($row['tier'])->toBe('gold');
});

test('Platina só acima de 1.000.000 Kz', function () {
    $restaurant = Restaurant::factory()->create();
    $service = app(CustomerLoyaltyService::class);

    loyaltyOrder($restaurant, ['total' => 1000000]);
    expect($service->forRestaurant($restaurant)->first()['tier'])->toBe('gold');

    loyaltyOrder($restaurant, ['total' => 1]);
    expect($service->forRestaurant($restaurant)->first()['tier'])->toBe('platinum');
});

test('não conta pedidos não cumpridos nem cauções reembolsadas', function () {
    $restaurant = Restaurant::factory()->create();

    loyaltyOrder($restaurant, ['status' => 'canceled', 'total' => 900000]);
    loyaltyOrder($restaurant, ['status' => 'rejected', 'total' => 900000]);
    loyaltyReservation($restaurant, ['status' => 'canceled', 'caution_amount' => 900000, 'caution_status' => 'refunded']);

    $row = app(CustomerLoyaltyService::class)->forRestaurant($restaurant)->first();
    expect($row['spend'])->toBe(0.0)->and($row['tier'])->toBe('regular');
});

test('é por restaurante: Gold num não é Gold noutro', function () {
    $a = Restaurant::factory()->create();
    $b = Restaurant::factory()->create();
    loyaltyOrder($a, ['total' => 600000]);
    loyaltyOrder($b, ['total' => 1000]);

    $service = app(CustomerLoyaltyService::class);
    expect($service->forRestaurant($a)->first()['tier'])->toBe('gold')
        ->and($service->forRestaurant($b)->first()['tier'])->toBe('regular');
});

test('staff vê o estatuto dos clientes; outro restaurante não', function () {
    $restaurant = Restaurant::factory()->create();
    loyaltyOrder($restaurant, ['total' => 600000]);

    $this->actingAs(ownerOf($restaurant), 'sanctum')
        ->getJson("/api/v1/restaurants/{$restaurant->uuid}/customer-loyalty")
        ->assertOk()
        ->assertJsonPath('data.thresholds.gold', 500000)
        ->assertJsonPath('data.thresholds.platinumAbove', 1000000)
        ->assertJsonMissingPath('data.thresholds.visits')
        ->assertJsonPath('data.customers.0.email', 'ana@example.com')
        ->assertJsonPath('data.customers.0.tier', 'gold');

    $this->actingAs(ownerOf(Restaurant::factory()->create()), 'sanctum')
        ->getJson("/api/v1/restaurants/{$restaurant->uuid}/customer-loyalty")
        ->assertForbidden();
});

test('restaurante Pro não tem Gestão de Clientes — funcionalidade só do Plano Plus', function () {
    $restaurant = Restaurant::factory()->create();
    RestaurantSubscription::query()->create([
        'restaurant_id' => $restaurant->id, 'plan' => 'pro',
        'started_at' => now(), 'trial_ends_at' => now()->addDays(60), 'status' => 'active',
    ]);

    $this->actingAs(ownerOf($restaurant), 'sanctum')
        ->getJson("/api/v1/restaurants/{$restaurant->uuid}/customer-loyalty")
        ->assertStatus(403);
});

test('cliente vê o próprio estatuto em cada restaurante', function () {
    $restaurant = Restaurant::factory()->create();
    $other = Restaurant::factory()->create();
    $user = User::factory()->create();
    loyaltyOrder($restaurant, ['user_id' => $user->id, 'total' => 1200000]);
    loyaltyReservation($other, ['user_id' => $user->id, 'caution_amount' => 5000, 'caution_status' => 'paid']);
    loyaltyOrder($restaurant, ['total' => 900000]); // de outra pessoa, não conta

    $response = $this->actingAs($user, 'sanctum')->getJson('/api/v1/loyalty')->assertOk();

    $rows = collect($response->json('data.restaurants'))->keyBy('restaurantId');
    expect($rows[$restaurant->uuid]['tier'])->toBe('platinum')
        ->and($rows[$restaurant->uuid]['spend'])->toEqual(1200000)
        ->and($rows[$other->uuid]['tier'])->toBe('regular')
        ->and($rows[$other->uuid])->not->toHaveKey('honoredCount');
});
