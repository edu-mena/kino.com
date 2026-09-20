<?php

use App\Models\Restaurant;
use App\Models\User;

test('staff só pode editar o restaurante a que pertence, não um restaurante alheio', function () {
    $ownRestaurant = Restaurant::factory()->create();
    $otherRestaurant = Restaurant::factory()->create();

    $owner = User::factory()->restaurantStaff()->create();
    $owner->restaurantUsers()->create(['restaurant_id' => $ownRestaurant->id, 'role_in_restaurant' => 'owner']);

    expect($owner->can('update', $ownRestaurant))->toBeTrue();
    expect($owner->can('update', $otherRestaurant))->toBeFalse();
});

test('só o owner (não manager/staff) gere payment-details ou convida staff', function () {
    $restaurant = Restaurant::factory()->create();

    $manager = User::factory()->restaurantStaff()->create();
    $manager->restaurantUsers()->create(['restaurant_id' => $restaurant->id, 'role_in_restaurant' => 'manager']);

    $owner = User::factory()->restaurantStaff()->create();
    $owner->restaurantUsers()->create(['restaurant_id' => $restaurant->id, 'role_in_restaurant' => 'owner']);

    expect($manager->can('managePaymentDetails', $restaurant))->toBeFalse();
    expect($manager->can('inviteStaff', $restaurant))->toBeFalse();
    expect($owner->can('managePaymentDetails', $restaurant))->toBeTrue();
    expect($owner->can('inviteStaff', $restaurant))->toBeTrue();
});

test('system_operator tem acesso total independentemente de restaurant_users', function () {
    $restaurant = Restaurant::factory()->create();
    $operator = User::factory()->systemOperator()->create();

    expect($operator->can('update', $restaurant))->toBeTrue();
    expect($operator->can('delete', $restaurant))->toBeTrue();
    expect($operator->can('managePaymentDetails', $restaurant))->toBeTrue();
});

test('customer nunca pode criar ou editar restaurante', function () {
    $restaurant = Restaurant::factory()->create();
    $customer = User::factory()->create();

    expect($customer->can('create', Restaurant::class))->toBeFalse();
    expect($customer->can('update', $restaurant))->toBeFalse();
});
