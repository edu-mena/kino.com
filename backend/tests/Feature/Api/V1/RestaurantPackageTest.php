<?php

use App\Models\PackageType;
use App\Models\Restaurant;
use App\Models\RestaurantPackage;
use App\Models\RestaurantSubscription;

test('staff cria, edita e apaga pacotes do próprio restaurante', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);
    $type = PackageType::factory()->create(['name' => 'Aniversário']);

    $response = $this->actingAs($owner, 'sanctum')->postJson("/api/v1/restaurants/{$restaurant->uuid}/packages", [
        'package_type_id' => $type->uuid,
        'price' => 45000,
        'max_people' => 20,
        'characteristics' => ['Bolo incluído', 'Decoração incluída'],
    ]);
    $response->assertStatus(201)
        ->assertJsonPath('data.price', 45000)
        ->assertJsonPath('data.packageType.name', 'Aniversário')
        ->assertJsonPath('data.isActive', true);

    $uuid = $response->json('data.id');

    $this->actingAs($owner, 'sanctum')
        ->patchJson("/api/v1/restaurant-packages/{$uuid}", ['title' => 'Aniversário Infantil', 'price' => 50000])
        ->assertOk()
        ->assertJsonPath('data.title', 'Aniversário Infantil')
        ->assertJsonPath('data.price', 50000);

    $this->actingAs($owner, 'sanctum')
        ->deleteJson("/api/v1/restaurant-packages/{$uuid}")
        ->assertStatus(204);
});

test('listagem pública só mostra pacotes ativos, staff do restaurante vê tudo', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);
    RestaurantPackage::factory()->for($restaurant)->create(['is_active' => true]);
    RestaurantPackage::factory()->for($restaurant)->create(['is_active' => false]);

    $this->getJson("/api/v1/restaurants/{$restaurant->uuid}/packages")
        ->assertOk()->assertJsonCount(1, 'data');

    $this->actingAs($owner, 'sanctum')
        ->getJson("/api/v1/restaurants/{$restaurant->uuid}/packages")
        ->assertOk()->assertJsonCount(2, 'data');
});

test('staff de outro restaurante não gere pacotes alheios, mas vê os ativos como qualquer visitante', function () {
    $restaurant = Restaurant::factory()->create();
    $otherRestaurant = Restaurant::factory()->create();
    $otherOwner = ownerOf($otherRestaurant);
    $active = RestaurantPackage::factory()->for($restaurant)->create(['is_active' => true]);
    RestaurantPackage::factory()->for($restaurant)->create(['is_active' => false]);

    $this->actingAs($otherOwner, 'sanctum')
        ->getJson("/api/v1/restaurants/{$restaurant->uuid}/packages")
        ->assertOk()->assertJsonCount(1, 'data');

    $this->actingAs($otherOwner, 'sanctum')
        ->patchJson("/api/v1/restaurant-packages/{$active->uuid}", ['price' => 1])
        ->assertForbidden();
});

test('restaurante Pro não pode oferecer pacotes — funcionalidade só do Plano Plus', function () {
    $restaurant = Restaurant::factory()->create();
    RestaurantSubscription::query()->create([
        'restaurant_id' => $restaurant->id, 'plan' => 'pro',
        'started_at' => now(), 'trial_ends_at' => now()->addDays(60), 'status' => 'active',
    ]);
    $owner = ownerOf($restaurant);
    $type = PackageType::factory()->create();

    $this->actingAs($owner, 'sanctum')
        ->postJson("/api/v1/restaurants/{$restaurant->uuid}/packages", [
            'package_type_id' => $type->uuid,
            'price' => 10000,
        ])
        ->assertStatus(403);
});

test('restaurante Plus pode oferecer pacotes', function () {
    $restaurant = Restaurant::factory()->create();
    RestaurantSubscription::query()->create([
        'restaurant_id' => $restaurant->id, 'plan' => 'plus',
        'started_at' => now(), 'trial_ends_at' => now()->addDays(60), 'status' => 'active',
    ]);
    $owner = ownerOf($restaurant);
    $type = PackageType::factory()->create();

    $this->actingAs($owner, 'sanctum')
        ->postJson("/api/v1/restaurants/{$restaurant->uuid}/packages", [
            'package_type_id' => $type->uuid,
            'price' => 10000,
        ])
        ->assertStatus(201);
});

test('não é possível escolher um tipo de pacote inativo', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);
    $type = PackageType::factory()->create(['is_active' => false]);

    $this->actingAs($owner, 'sanctum')
        ->postJson("/api/v1/restaurants/{$restaurant->uuid}/packages", [
            'package_type_id' => $type->uuid,
            'price' => 10000,
        ])
        ->assertStatus(422)->assertJsonValidationErrors('package_type_id');
});

test('apagar um tipo de pacote apaga em cascata os pacotes dos restaurantes que o usavam', function () {
    $restaurant = Restaurant::factory()->create();
    $type = PackageType::factory()->create();
    $package = RestaurantPackage::factory()->for($restaurant)->create(['package_type_id' => $type->id]);

    $type->delete();

    expect(RestaurantPackage::find($package->id))->toBeNull();
});
