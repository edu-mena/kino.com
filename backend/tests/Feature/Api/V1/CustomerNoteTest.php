<?php

use App\Models\Restaurant;
use App\Models\RestaurantSubscription;

test('staff grava e lê notas de um cliente do próprio restaurante', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);
    $key = 'cliente@example.com';

    $this->actingAs($owner, 'sanctum')
        ->putJson("/api/v1/restaurants/{$restaurant->uuid}/customer-notes/{$key}", ['notes' => 'Alérgico a marisco.'])
        ->assertOk()->assertJsonPath('data.notes', 'Alérgico a marisco.');

    $this->actingAs($owner, 'sanctum')
        ->getJson("/api/v1/restaurants/{$restaurant->uuid}/customer-notes/{$key}")
        ->assertOk()->assertJsonPath('data.notes', 'Alérgico a marisco.');
});

test('staff de outro restaurante não lê/edita notas alheias', function () {
    $restaurant = Restaurant::factory()->create();
    $otherRestaurant = Restaurant::factory()->create();
    $otherOwner = ownerOf($otherRestaurant);
    $key = 'cliente@example.com';
    $restaurant->customerNotes()->create(['customer_key' => $key, 'notes' => 'Secreto']);

    $this->actingAs($otherOwner, 'sanctum')
        ->getJson("/api/v1/restaurants/{$restaurant->uuid}/customer-notes/{$key}")
        ->assertForbidden();
});

test('sem nota gravada devolve notas vazias, não 404', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);

    $this->actingAs($owner, 'sanctum')
        ->getJson("/api/v1/restaurants/{$restaurant->uuid}/customer-notes/ninguem@example.com")
        ->assertOk()->assertJsonPath('data.notes', '');
});

test('restaurante Pro não acede a notas de cliente — funcionalidade só do Plano Plus', function () {
    $restaurant = Restaurant::factory()->create();
    RestaurantSubscription::query()->create([
        'restaurant_id' => $restaurant->id, 'plan' => 'pro',
        'started_at' => now(), 'trial_ends_at' => now()->addDays(60), 'status' => 'active',
    ]);
    $owner = ownerOf($restaurant);

    $this->actingAs($owner, 'sanctum')
        ->getJson("/api/v1/restaurants/{$restaurant->uuid}/customer-notes/cliente@example.com")
        ->assertStatus(403);

    $this->actingAs($owner, 'sanctum')
        ->putJson("/api/v1/restaurants/{$restaurant->uuid}/customer-notes/cliente@example.com", ['notes' => 'X'])
        ->assertStatus(403);
});
