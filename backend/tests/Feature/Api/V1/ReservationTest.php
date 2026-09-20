<?php

use App\Models\Restaurant;
use App\Models\RestaurantTable;
use App\Models\User;
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
