<?php

use App\Models\MenuItem;
use App\Models\Restaurant;
use App\Models\RestaurantMenu;

test('não é possível apagar o último cardápio do restaurante', function () {
    $restaurant = Restaurant::factory()->create();
    $menu = RestaurantMenu::factory()->for($restaurant)->create();
    $owner = ownerOf($restaurant);

    $response = $this->actingAs($owner, 'sanctum')->deleteJson("/api/v1/menus/{$menu->uuid}");

    $response->assertStatus(422);
    expect($menu->fresh())->not->toBeNull();
});

test('não é possível apagar um cardápio que ainda tem pratos', function () {
    $restaurant = Restaurant::factory()->create();
    RestaurantMenu::factory()->for($restaurant)->create(); // 2º cardápio, para não cair no guard "é o último"
    $menuWithItems = RestaurantMenu::factory()->for($restaurant)->create();
    MenuItem::factory()->for($restaurant)->create(['menu_id' => $menuWithItems->id]);
    $owner = ownerOf($restaurant);

    $response = $this->actingAs($owner, 'sanctum')->deleteJson("/api/v1/menus/{$menuWithItems->uuid}");

    $response->assertStatus(422);
});

test('apaga um cardápio vazio quando não é o último', function () {
    $restaurant = Restaurant::factory()->create();
    RestaurantMenu::factory()->for($restaurant)->create();
    $emptyMenu = RestaurantMenu::factory()->for($restaurant)->create();
    $owner = ownerOf($restaurant);

    $response = $this->actingAs($owner, 'sanctum')->deleteJson("/api/v1/menus/{$emptyMenu->uuid}");

    $response->assertStatus(204);
    expect(RestaurantMenu::find($emptyMenu->id))->toBeNull();
});
