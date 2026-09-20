<?php

use App\Models\Restaurant;
use App\Models\SupportTicket;
use App\Models\User;

test('staff cria ticket para o próprio restaurante', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);

    $response = $this->actingAs($owner, 'sanctum')->postJson("/api/v1/restaurants/{$restaurant->uuid}/support-tickets", [
        'subject' => 'Problema com pagamentos', 'message' => 'Não consigo ver o histórico.',
    ]);

    $response->assertStatus(201)->assertJsonPath('data.status', 'open');
});

test('só system_operator vê a lista global de tickets', function () {
    SupportTicket::factory()->count(2)->create();
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);

    $this->actingAs($owner, 'sanctum')->getJson('/api/v1/support-tickets')->assertForbidden();

    $operator = User::factory()->systemOperator()->create();
    $this->actingAs($operator, 'sanctum')->getJson('/api/v1/support-tickets')->assertOk()->assertJsonCount(2, 'data');
});

test('staff só vê os tickets do próprio restaurante', function () {
    $restaurant = Restaurant::factory()->create();
    $otherRestaurant = Restaurant::factory()->create();
    SupportTicket::factory()->for($restaurant)->create();
    SupportTicket::factory()->for($otherRestaurant)->create();
    $owner = ownerOf($restaurant);

    $response = $this->actingAs($owner, 'sanctum')->getJson("/api/v1/restaurants/{$restaurant->uuid}/support-tickets");

    $response->assertOk()->assertJsonCount(1, 'data');
});

test('só system_operator resolve um ticket — o restaurante não pode', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);
    $ticket = SupportTicket::factory()->for($restaurant)->create();

    $this->actingAs($owner, 'sanctum')
        ->patchJson("/api/v1/support-tickets/{$ticket->uuid}/status", ['status' => 'resolved'])
        ->assertForbidden();

    $operator = User::factory()->systemOperator()->create();
    $this->actingAs($operator, 'sanctum')
        ->patchJson("/api/v1/support-tickets/{$ticket->uuid}/status", ['status' => 'resolved'])
        ->assertOk()->assertJsonPath('data.status', 'resolved');
});
