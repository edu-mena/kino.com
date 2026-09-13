<?php

use App\Models\MenuItem;
use App\Models\Restaurant;
use App\Models\RestaurantMenu;
use App\Models\User;

test('criar prato com ingredientes grava tudo numa transação', function () {
    $restaurant = Restaurant::factory()->create();
    $menu = RestaurantMenu::factory()->for($restaurant)->create();
    $owner = ownerOf($restaurant);

    $response = $this->actingAs($owner, 'sanctum')->postJson("/api/v1/restaurants/{$restaurant->uuid}/menu-items", [
        'menu_id' => $menu->id,
        'name' => 'Muamba de Galinha',
        'price' => 3500,
        'category' => 'Pratos principais',
        'ingredients' => [
            ['name' => 'Óleo de palma', 'removable' => true],
            ['name' => 'Quiabo extra', 'removable' => false, 'extra_price' => 500],
        ],
    ]);

    $response->assertStatus(201)->assertJsonCount(2, 'data.ingredients');
});

test('não é possível associar um prato a um cardápio de outro restaurante', function () {
    $restaurant = Restaurant::factory()->create();
    $otherRestaurant = Restaurant::factory()->create();
    $foreignMenu = RestaurantMenu::factory()->for($otherRestaurant)->create();
    $owner = ownerOf($restaurant);

    $response = $this->actingAs($owner, 'sanctum')->postJson("/api/v1/restaurants/{$restaurant->uuid}/menu-items", [
        'menu_id' => $foreignMenu->id,
        'name' => 'Prato Suspeito',
        'price' => 1000,
        'category' => 'Pratos principais',
    ]);

    $response->assertStatus(422)->assertJsonValidationErrors('menu_id');
});

test('manager consegue criar prato mas não editar payment-details (papéis diferentes)', function () {
    $restaurant = Restaurant::factory()->create();
    $menu = RestaurantMenu::factory()->for($restaurant)->create();
    $manager = User::factory()->restaurantStaff()->create();
    $manager->restaurantUsers()->create(['restaurant_id' => $restaurant->id, 'role_in_restaurant' => 'manager']);

    $this->actingAs($manager, 'sanctum')->postJson("/api/v1/restaurants/{$restaurant->uuid}/menu-items", [
        'menu_id' => $menu->id,
        'name' => 'Calulu de Peixe',
        'price' => 4000,
        'category' => 'Pratos principais',
    ])->assertStatus(201);
});

test('filtrar pratos por categoria e disponibilidade', function () {
    $restaurant = Restaurant::factory()->create();
    $menu = RestaurantMenu::factory()->for($restaurant)->create();
    MenuItem::factory()->for($restaurant)->create(['menu_id' => $menu->id, 'category' => 'Sobremesas', 'is_available' => true]);
    MenuItem::factory()->for($restaurant)->create(['menu_id' => $menu->id, 'category' => 'Sobremesas', 'is_available' => false]);
    MenuItem::factory()->for($restaurant)->create(['menu_id' => $menu->id, 'category' => 'Bebidas', 'is_available' => true]);

    $response = $this->getJson("/api/v1/restaurants/{$restaurant->uuid}/menu-items?filter[category]=Sobremesas&filter[is_available]=1");

    $response->assertOk()->assertJsonCount(1, 'data');
});
