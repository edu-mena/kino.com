<?php

use App\Models\DeliveryPolicy;
use App\Models\Restaurant;
use App\Models\User;

test('política de entrega é pública', function () {
    DeliveryPolicy::query()->updateOrCreate(['id' => 1], ['free_radius_km' => 5, 'per_km_surcharge_kz' => 150]);

    $this->getJson('/api/v1/delivery-policy')
        ->assertOk()->assertJsonPath('data.freeRadiusKm', 5);
});

test('só system_operator atualiza a política de entrega', function () {
    DeliveryPolicy::query()->updateOrCreate(['id' => 1], ['free_radius_km' => 5, 'per_km_surcharge_kz' => 150]);
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);

    $this->actingAs($owner, 'sanctum')
        ->patchJson('/api/v1/delivery-policy', ['free_radius_km' => 8])
        ->assertForbidden();

    $operator = User::factory()->systemOperator()->create();
    $this->actingAs($operator, 'sanctum')
        ->patchJson('/api/v1/delivery-policy', ['free_radius_km' => 8])
        ->assertOk()->assertJsonPath('data.freeRadiusKm', 8);
});
