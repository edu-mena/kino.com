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
        'menu_id' => $menu->uuid,
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
        'menu_id' => $foreignMenu->uuid,
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
        'menu_id' => $menu->uuid,
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

test('listagem de pratos devolve o menuId — sem isto o PDF/QR do cardápio não conseguem agrupar os pratos por cardápio', function () {
    $restaurant = Restaurant::factory()->create();
    $menu = RestaurantMenu::factory()->for($restaurant)->create();
    MenuItem::factory()->for($restaurant)->create(['menu_id' => $menu->id]);

    $response = $this->getJson("/api/v1/restaurants/{$restaurant->uuid}/menu-items");

    $response->assertOk()->assertJsonPath('data.0.menuId', $menu->uuid);
});

test('prato de buffet/self-service não exige preço', function () {
    $restaurant = Restaurant::factory()->create();
    $menu = RestaurantMenu::factory()->for($restaurant)->create();
    $owner = ownerOf($restaurant);

    $response = $this->actingAs($owner, 'sanctum')->postJson("/api/v1/restaurants/{$restaurant->uuid}/menu-items", [
        'menu_id' => $menu->uuid,
        'name' => 'Mesa de Saladas',
        'category' => 'Buffet',
        'is_buffet_only' => true,
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.price', null)
        ->assertJsonPath('data.isBuffetOnly', true);
});

test('prato normal continua a exigir preço (regressão)', function () {
    $restaurant = Restaurant::factory()->create();
    $menu = RestaurantMenu::factory()->for($restaurant)->create();
    $owner = ownerOf($restaurant);

    $response = $this->actingAs($owner, 'sanctum')->postJson("/api/v1/restaurants/{$restaurant->uuid}/menu-items", [
        'menu_id' => $menu->uuid,
        'name' => 'Prato Sem Preço',
        'category' => 'Pratos principais',
    ]);

    $response->assertStatus(422)->assertJsonValidationErrors('price');
});

test('editar só o nome de um prato normal não obriga a reenviar o preço (regressão)', function () {
    $restaurant = Restaurant::factory()->create();
    $menu = RestaurantMenu::factory()->for($restaurant)->create();
    $owner = ownerOf($restaurant);
    $item = MenuItem::factory()->for($restaurant)->create(['menu_id' => $menu->id, 'price' => 2500]);

    $response = $this->actingAs($owner, 'sanctum')->patchJson("/api/v1/menu-items/{$item->uuid}", [
        'name' => 'Nome Novo',
    ]);

    $response->assertStatus(200)->assertJsonPath('data.name', 'Nome Novo');
});

test('marcar um prato existente como buffet ao editar não exige preço', function () {
    $restaurant = Restaurant::factory()->create();
    $menu = RestaurantMenu::factory()->for($restaurant)->create();
    $owner = ownerOf($restaurant);
    $item = MenuItem::factory()->for($restaurant)->create(['menu_id' => $menu->id, 'price' => 2500]);

    $response = $this->actingAs($owner, 'sanctum')->patchJson("/api/v1/menu-items/{$item->uuid}", [
        'is_buffet_only' => true,
        'price' => null,
    ]);

    $response->assertStatus(200)
        ->assertJsonPath('data.price', null)
        ->assertJsonPath('data.isBuffetOnly', true);
});
