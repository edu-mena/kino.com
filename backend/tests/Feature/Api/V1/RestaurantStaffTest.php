<?php

use App\Models\Restaurant;
use App\Models\User;
use Illuminate\Support\Facades\Password;

test('owner convida um novo email — cria conta e manda link de definir senha', function () {
    Password::shouldReceive('sendResetLink')->once();
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);

    $response = $this->actingAs($owner, 'sanctum')->postJson("/api/v1/restaurants/{$restaurant->uuid}/staff", [
        'name' => 'Novo Funcionário', 'email' => 'novo@example.com', 'role_in_restaurant' => 'manager',
    ]);

    $response->assertStatus(201)->assertJsonPath('data.roleInRestaurant', 'manager');
    expect(User::where('email', 'novo@example.com')->first()->role)->toBe('restaurant_staff');
});

test('owner convida email já existente (conta doutro restaurante) — liga sem duplicar nem reenviar convite', function () {
    Password::shouldReceive('sendResetLink')->never();
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);
    User::factory()->restaurantStaff()->create(['email' => 'ja-existe@example.com']);

    $this->actingAs($owner, 'sanctum')->postJson("/api/v1/restaurants/{$restaurant->uuid}/staff", [
        'name' => 'X', 'email' => 'ja-existe@example.com', 'role_in_restaurant' => 'staff',
    ])->assertStatus(201);

    expect(User::where('email', 'ja-existe@example.com')->count())->toBe(1);
});

test('não é possível convidar a mesma pessoa duas vezes para o mesmo restaurante', function () {
    Password::shouldReceive('sendResetLink')->once();
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);

    $this->actingAs($owner, 'sanctum')->postJson("/api/v1/restaurants/{$restaurant->uuid}/staff", [
        'name' => 'X', 'email' => 'dup@example.com', 'role_in_restaurant' => 'staff',
    ])->assertStatus(201);

    $this->actingAs($owner, 'sanctum')->postJson("/api/v1/restaurants/{$restaurant->uuid}/staff", [
        'name' => 'X', 'email' => 'dup@example.com', 'role_in_restaurant' => 'manager',
    ])->assertStatus(422);
});

test('só o owner convida/remove staff — manager não pode', function () {
    $restaurant = Restaurant::factory()->create();
    $manager = User::factory()->restaurantStaff()->create();
    $manager->restaurantUsers()->create(['restaurant_id' => $restaurant->id, 'role_in_restaurant' => 'manager']);

    $this->actingAs($manager, 'sanctum')->postJson("/api/v1/restaurants/{$restaurant->uuid}/staff", [
        'name' => 'X', 'email' => 'x@example.com', 'role_in_restaurant' => 'staff',
    ])->assertForbidden();
});

test('não é possível remover nem mudar o papel do dono', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);

    $this->actingAs($owner, 'sanctum')
        ->patchJson("/api/v1/restaurants/{$restaurant->uuid}/staff/{$owner->uuid}", ['role_in_restaurant' => 'staff'])
        ->assertStatus(422);

    $this->actingAs($owner, 'sanctum')
        ->deleteJson("/api/v1/restaurants/{$restaurant->uuid}/staff/{$owner->uuid}")
        ->assertStatus(422);
});

test('owner remove um manager normalmente', function () {
    Password::shouldReceive('sendResetLink')->once();
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);
    $this->actingAs($owner, 'sanctum')->postJson("/api/v1/restaurants/{$restaurant->uuid}/staff", [
        'name' => 'X', 'email' => 'remover@example.com', 'role_in_restaurant' => 'manager',
    ]);
    $manager = User::where('email', 'remover@example.com')->firstOrFail();

    $this->actingAs($owner, 'sanctum')
        ->deleteJson("/api/v1/restaurants/{$restaurant->uuid}/staff/{$manager->uuid}")
        ->assertStatus(204);
});
