<?php

use App\Models\User;

test('só system_operator vê a contagem de clientes', function () {
    User::factory()->count(3)->create(); // role padrão: customer
    User::factory()->restaurantStaff()->create(); // não deve contar

    $customer = User::factory()->create();
    $this->actingAs($customer, 'sanctum')->getJson('/api/v1/system/customers-count')->assertForbidden();

    $operator = User::factory()->systemOperator()->create();
    $this->actingAs($operator, 'sanctum')
        ->getJson('/api/v1/system/customers-count')
        ->assertOk()->assertJsonPath('data.count', 4);
});
