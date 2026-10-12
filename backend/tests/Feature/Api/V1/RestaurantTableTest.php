<?php

use App\Models\QrCode;
use App\Models\Restaurant;
use App\Models\RestaurantTable;
use App\Models\TableCombination;

test('staff cria, lista e apaga mesas do próprio restaurante', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);

    $response = $this->actingAs($owner, 'sanctum')->postJson("/api/v1/restaurants/{$restaurant->uuid}/tables", [
        'name' => 'Mesa 5', 'seats' => 4, 'area' => 'Esplanada',
    ]);
    $response->assertStatus(201);

    $this->actingAs($owner, 'sanctum')
        ->getJson("/api/v1/restaurants/{$restaurant->uuid}/tables")
        ->assertOk()->assertJsonCount(1, 'data');

    $tableUuid = $response->json('data.id');
    $this->actingAs($owner, 'sanctum')->deleteJson("/api/v1/tables/{$tableUuid}")->assertStatus(204);
});

test('staff de outro restaurante não gere mesas alheias', function () {
    $restaurant = Restaurant::factory()->create();
    $otherRestaurant = Restaurant::factory()->create();
    $otherOwner = ownerOf($otherRestaurant);
    $table = RestaurantTable::factory()->for($restaurant)->create();

    $this->actingAs($otherOwner, 'sanctum')
        ->getJson("/api/v1/restaurants/{$restaurant->uuid}/tables")
        ->assertForbidden();

    $this->actingAs($otherOwner, 'sanctum')
        ->patchJson("/api/v1/tables/{$table->uuid}", ['seats' => 99])
        ->assertForbidden();

    $this->actingAs($otherOwner, 'sanctum')
        ->postJson("/api/v1/restaurants/{$restaurant->uuid}/tables/bulk", [
            'prefix' => 'Mesa', 'start' => 1, 'count' => 3, 'seats' => 4,
        ])
        ->assertForbidden();
});

test('mesa guarda descrição, características, forma e estado — e nasce com QR', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);

    $response = $this->actingAs($owner, 'sanctum')->postJson("/api/v1/restaurants/{$restaurant->uuid}/tables", [
        'name' => 'Sofá 1', 'seats' => 6, 'area' => 'Interior',
        'description' => 'Banco corrido encostado à parede',
        'features' => ['fixed_seats', 'sofa'],
        'shape' => 'booth',
        'is_combinable' => false,
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.description', 'Banco corrido encostado à parede')
        ->assertJsonPath('data.features', ['fixed_seats', 'sofa'])
        ->assertJsonPath('data.shape', 'booth')
        ->assertJsonPath('data.isCombinable', false)
        ->assertJsonPath('data.isActive', true);

    expect($response->json('data.qrCode.code'))->toMatch('/^[2-9A-HJKMNP-Z]{7}$/');
});

test('mesa recusa características e formas desconhecidas', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);

    $this->actingAs($owner, 'sanctum')->postJson("/api/v1/restaurants/{$restaurant->uuid}/tables", [
        'name' => 'Mesa X', 'seats' => 4, 'features' => ['jacuzzi'], 'shape' => 'triangle',
    ])->assertUnprocessable()->assertJsonValidationErrors(['features.0', 'shape']);
});

test('criar várias mesas de uma vez salta nomes que já existem', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);
    RestaurantTable::factory()->for($restaurant)->create(['name' => 'Mesa 2']);

    $response = $this->actingAs($owner, 'sanctum')->postJson("/api/v1/restaurants/{$restaurant->uuid}/tables/bulk", [
        'prefix' => 'Mesa', 'start' => 1, 'count' => 4, 'seats' => 4, 'area' => 'Interior', 'shape' => 'round',
    ]);

    $response->assertStatus(201)->assertJsonCount(3, 'data');
    expect($restaurant->tables()->pluck('name')->sort()->values()->all())
        ->toBe(['Mesa 1', 'Mesa 2', 'Mesa 3', 'Mesa 4']);
    expect(QrCode::query()->where('restaurant_id', $restaurant->id)->where('kind', 'table')->count())->toBe(4);
});

test('a ordem manual da sala é gravada e devolvida', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);
    [$a, $b, $c] = RestaurantTable::factory()->for($restaurant)->count(3)->create();

    $this->actingAs($owner, 'sanctum')
        ->putJson("/api/v1/restaurants/{$restaurant->uuid}/tables/order", ['ids' => [$c->uuid, $a->uuid]])
        ->assertStatus(204);

    $this->actingAs($owner, 'sanctum')
        ->getJson("/api/v1/restaurants/{$restaurant->uuid}/tables")
        ->assertOk()
        ->assertJsonPath('data.0.id', $c->uuid)
        ->assertJsonPath('data.1.id', $a->uuid)
        ->assertJsonPath('data.2.id', $b->uuid);
});

test('tirar uma mesa de serviço desfaz as junções futuras que ficariam com uma mesa só', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);
    [$a, $b] = RestaurantTable::factory()->for($restaurant)->count(2)->create();
    $combination = $restaurant->tableCombinations()->create(['date' => now()->addDay()->toDateString(), 'seats' => 8]);
    $combination->syncTables([$a->id, $b->id]);

    $this->actingAs($owner, 'sanctum')
        ->patchJson("/api/v1/tables/{$a->uuid}", ['is_active' => false])
        ->assertOk()
        ->assertJsonPath('data.isActive', false);

    expect(TableCombination::query()->find($combination->id))->toBeNull();
});

test('apagar uma mesa mantém o QR impresso a funcionar (sem mesa)', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);
    $table = RestaurantTable::factory()->for($restaurant)->create();
    $code = $table->qrCode()->value('code');

    $this->actingAs($owner, 'sanctum')->deleteJson("/api/v1/tables/{$table->uuid}")->assertStatus(204);

    $this->getJson("/api/v1/qr/{$code}")
        ->assertOk()
        ->assertJsonPath('data.restaurant.id', $restaurant->uuid)
        ->assertJsonPath('data.table', null);
});
