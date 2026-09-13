<?php

use App\Models\Restaurant;
use App\Models\RestaurantTable;

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
});
