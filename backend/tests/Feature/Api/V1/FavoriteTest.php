<?php

use App\Models\Restaurant;
use App\Models\User;

test('cliente adiciona, lista e remove favorito', function () {
    $restaurant = Restaurant::factory()->create();
    $user = User::factory()->create();

    $this->actingAs($user, 'sanctum')
        ->postJson("/api/v1/restaurants/{$restaurant->uuid}/favorite")
        ->assertStatus(204);

    $this->actingAs($user, 'sanctum')
        ->getJson('/api/v1/favorites')
        ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $restaurant->uuid);

    $this->actingAs($user, 'sanctum')
        ->deleteJson("/api/v1/restaurants/{$restaurant->uuid}/favorite")
        ->assertStatus(204);

    $this->actingAs($user, 'sanctum')->getJson('/api/v1/favorites')->assertOk()->assertJsonCount(0, 'data');
});

test('favoritar duas vezes não duplica', function () {
    $restaurant = Restaurant::factory()->create();
    $user = User::factory()->create();

    $this->actingAs($user, 'sanctum')->postJson("/api/v1/restaurants/{$restaurant->uuid}/favorite")->assertStatus(204);
    $this->actingAs($user, 'sanctum')->postJson("/api/v1/restaurants/{$restaurant->uuid}/favorite")->assertStatus(204);

    expect($user->favoriteRestaurants()->count())->toBe(1);
});

test('favoritos são só os do próprio user', function () {
    $restaurant = Restaurant::factory()->create();
    $userA = User::factory()->create();
    $userB = User::factory()->create();

    $this->actingAs($userA, 'sanctum')->postJson("/api/v1/restaurants/{$restaurant->uuid}/favorite");

    $this->actingAs($userB, 'sanctum')->getJson('/api/v1/favorites')->assertOk()->assertJsonCount(0, 'data');
});
