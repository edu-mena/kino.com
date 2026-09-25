<?php

use App\Models\Restaurant;
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

test('Gold com mais de 25 reservas e pedidos cumpridos (26 ou mais)', function () {
    $restaurant = Restaurant::factory()->create();
    $service = app(CustomerLoyaltyService::class);

    // 13 pedidos + 12 reservas = 25 cumpridos: ainda não chega.
    for ($i = 0; $i < 13; $i++) {
        loyaltyOrder($restaurant);
    }
    for ($i = 0; $i < 12; $i++) {
        loyaltyReservation($restaurant);
    }
    $row = $service->forRestaurant($restaurant)->first();
    expect($row['honoredCount'])->toBe(25)->and($row['tier'])->toBe('regular');

    loyaltyReservation($restaurant);
    $row = $service->forRestaurant($restaurant)->first();
    expect($row['honoredCount'])->toBe(26)->and($row['tier'])->toBe('gold');
});

test('Gold por gasto: pedidos com taxas mais cauções pagas somam 500.000 Kz', function () {
    $restaurant = Restaurant::factory()->create();

    loyaltyOrder($restaurant, ['subtotal' => 400000, 'delivery_fee' => 50000, 'total' => 450000]);
    loyaltyReservation($restaurant, ['caution_amount' => 50000, 'caution_status' => 'paid']);

    $row = app(CustomerLoyaltyService::class)->forRestaurant($restaurant)->first();
    expect($row['spend'])->toBe(500000.0)->and($row['tier'])->toBe('gold');
});

test('não conta o que não foi cumprido nem cauções reembolsadas', function () {
    $restaurant = Restaurant::factory()->create();

    loyaltyOrder($restaurant, ['status' => 'canceled', 'total' => 900000]);
    loyaltyOrder($restaurant, ['status' => 'rejected', 'total' => 900000]);
    loyaltyReservation($restaurant, ['status' => 'no_show']);
    loyaltyReservation($restaurant, ['status' => 'declined']);
    // Confirmada mas ainda no futuro: não foi cumprida.
    loyaltyReservation($restaurant, ['date' => now()->addDays(3)->toDateString()]);
    loyaltyReservation($restaurant, ['status' => 'canceled', 'caution_amount' => 900000, 'caution_status' => 'refunded']);

    $row = app(CustomerLoyaltyService::class)->forRestaurant($restaurant)->first();
    expect($row['honoredCount'])->toBe(0)->and($row['spend'])->toBe(0.0)->and($row['tier'])->toBe('regular');
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
        ->assertJsonPath('data.thresholds.visits', 26)
        ->assertJsonPath('data.thresholds.spend', 500000)
        ->assertJsonPath('data.customers.0.email', 'ana@example.com')
        ->assertJsonPath('data.customers.0.tier', 'gold');

    $this->actingAs(ownerOf(Restaurant::factory()->create()), 'sanctum')
        ->getJson("/api/v1/restaurants/{$restaurant->uuid}/customer-loyalty")
        ->assertForbidden();
});

test('cliente vê o próprio estatuto em cada restaurante', function () {
    $restaurant = Restaurant::factory()->create();
    $other = Restaurant::factory()->create();
    $user = User::factory()->create();
    loyaltyOrder($restaurant, ['user_id' => $user->id, 'total' => 600000]);
    loyaltyReservation($other, ['user_id' => $user->id]);
    loyaltyOrder($restaurant, ['total' => 900000]); // de outra pessoa, não conta

    $response = $this->actingAs($user, 'sanctum')->getJson('/api/v1/loyalty')->assertOk();

    $rows = collect($response->json('data.restaurants'))->keyBy('restaurantId');
    expect($rows[$restaurant->uuid]['tier'])->toBe('gold')
        ->and($rows[$restaurant->uuid]['spend'])->toEqual(600000)
        ->and($rows[$other->uuid]['tier'])->toBe('regular')
        ->and($rows[$other->uuid]['honoredCount'])->toBe(1);
});
