<?php

use App\Models\Restaurant;
use App\Models\RestaurantTable;

test('staff junta mesas num dia — capacidade por omissão é a soma, a ordem é mantida', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);
    $a = RestaurantTable::factory()->for($restaurant)->create(['seats' => 4]);
    $b = RestaurantTable::factory()->for($restaurant)->create(['seats' => 2]);
    $date = now()->addDays(2)->toDateString();

    $this->actingAs($owner, 'sanctum')
        ->postJson("/api/v1/restaurants/{$restaurant->uuid}/table-combinations", [
            'date' => $date, 'table_ids' => [$b->uuid, $a->uuid],
        ])
        ->assertStatus(201)
        ->assertJsonPath('data.date', $date)
        ->assertJsonPath('data.seats', 6)
        ->assertJsonPath('data.tableIds', [$b->uuid, $a->uuid]);

    $this->actingAs($owner, 'sanctum')
        ->getJson("/api/v1/restaurants/{$restaurant->uuid}/table-combinations?from={$date}&to={$date}")
        ->assertOk()
        ->assertJsonCount(1, 'data');

    // Outro dia não vê a junção.
    $this->actingAs($owner, 'sanctum')
        ->getJson("/api/v1/restaurants/{$restaurant->uuid}/table-combinations?from=".now()->addDays(3)->toDateString())
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

test('capacidade da junção pode ser ajustada (duas de 4 juntas dão 6)', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);
    [$a, $b] = RestaurantTable::factory()->for($restaurant)->count(2)->create(['seats' => 4]);

    $uuid = $this->actingAs($owner, 'sanctum')
        ->postJson("/api/v1/restaurants/{$restaurant->uuid}/table-combinations", [
            'date' => now()->toDateString(), 'table_ids' => [$a->uuid, $b->uuid], 'seats' => 6, 'label' => 'Grupo Silva',
        ])
        ->assertStatus(201)
        ->assertJsonPath('data.seats', 6)
        ->json('data.id');

    $this->actingAs($owner, 'sanctum')
        ->patchJson("/api/v1/table-combinations/{$uuid}", ['seats' => 7])
        ->assertOk()
        ->assertJsonPath('data.seats', 7)
        ->assertJsonPath('data.label', 'Grupo Silva');
});

test('não junta mesas fixas, fora de serviço ou já juntas nesse dia', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);
    $fixed = RestaurantTable::factory()->for($restaurant)->create(['name' => 'Sofá', 'is_combinable' => false]);
    [$a, $b, $c] = RestaurantTable::factory()->for($restaurant)->count(3)->create();
    $date = now()->toDateString();
    $url = "/api/v1/restaurants/{$restaurant->uuid}/table-combinations";

    $this->actingAs($owner, 'sanctum')
        ->postJson($url, ['date' => $date, 'table_ids' => [$fixed->uuid, $a->uuid]])
        ->assertUnprocessable()->assertJsonValidationErrors('table_ids');

    $this->actingAs($owner, 'sanctum')
        ->postJson($url, ['date' => $date, 'table_ids' => [$a->uuid, $b->uuid]])
        ->assertStatus(201);

    $this->actingAs($owner, 'sanctum')
        ->postJson($url, ['date' => $date, 'table_ids' => [$b->uuid, $c->uuid]])
        ->assertUnprocessable()->assertJsonValidationErrors('table_ids');

    // Noutro dia, a mesma mesa pode entrar noutra junção.
    $this->actingAs($owner, 'sanctum')
        ->postJson($url, ['date' => now()->addDay()->toDateString(), 'table_ids' => [$b->uuid, $c->uuid]])
        ->assertStatus(201);

    // Uma mesa só não é junção.
    $this->actingAs($owner, 'sanctum')
        ->postJson($url, ['date' => $date, 'table_ids' => [$c->uuid]])
        ->assertUnprocessable()->assertJsonValidationErrors('table_ids');
});

test('não junta mesas de outro restaurante nem gere junções alheias', function () {
    $restaurant = Restaurant::factory()->create();
    $other = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);
    $mine = RestaurantTable::factory()->for($restaurant)->create();
    $theirs = RestaurantTable::factory()->for($other)->create();

    $this->actingAs($owner, 'sanctum')
        ->postJson("/api/v1/restaurants/{$restaurant->uuid}/table-combinations", [
            'date' => now()->toDateString(), 'table_ids' => [$mine->uuid, $theirs->uuid],
        ])
        ->assertUnprocessable()->assertJsonValidationErrors('table_ids.1');

    [$x, $y] = RestaurantTable::factory()->for($other)->count(2)->create();
    $combination = $other->tableCombinations()->create(['date' => now()->toDateString(), 'seats' => 8]);
    $combination->syncTables([$x->id, $y->id]);

    $this->actingAs($owner, 'sanctum')
        ->deleteJson("/api/v1/table-combinations/{$combination->uuid}")
        ->assertForbidden();
});

test('separar desfaz a junção e a reserva fica na mesa âncora', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);
    [$a, $b] = RestaurantTable::factory()->for($restaurant)->count(2)->create();
    $combination = $restaurant->tableCombinations()->create(['date' => now()->toDateString(), 'seats' => 8]);
    $combination->syncTables([$a->id, $b->id]);
    $reservation = $restaurant->reservations()->create([
        'customer_name' => 'Grupo', 'customer_phone' => '900', 'date' => now()->toDateString(),
        'time' => '20:00', 'people_count' => 8, 'status' => 'confirmed', 'table_id' => $a->id,
    ]);

    $this->actingAs($owner, 'sanctum')
        ->deleteJson("/api/v1/table-combinations/{$combination->uuid}")
        ->assertStatus(204);

    expect($reservation->fresh()->table_id)->toBe($a->id);
    expect($restaurant->tableCombinations()->count())->toBe(0);
});

test('reserva numa mesa junta ocupa a junção — outra reserva na outra mesa à mesma hora é choque', function () {
    $restaurant = Restaurant::factory()->create(['reservation_slot_minutes' => 120]);
    $owner = ownerOf($restaurant);
    [$a, $b] = RestaurantTable::factory()->for($restaurant)->count(2)->create(['seats' => 4]);
    $date = now()->addDay()->toDateString();
    $combination = $restaurant->tableCombinations()->create(['date' => $date, 'seats' => 8]);
    $combination->syncTables([$a->id, $b->id]);
    foreach ([[$a, 'Grupo'], [$b, 'Casal']] as [$table, $name]) {
        $restaurant->reservations()->create([
            'customer_name' => $name, 'customer_phone' => '900', 'date' => $date,
            'time' => '20:00', 'people_count' => 2, 'status' => 'confirmed', 'table_id' => $table->id,
        ]);
    }

    $this->actingAs($owner, 'sanctum')
        ->getJson("/api/v1/restaurants/{$restaurant->uuid}/reservations")
        ->assertOk()
        ->assertJsonPath('data.0.occupancy.tableClash', true);
});
