<?php

use App\Models\User;

test('sem preferências gravadas devolve valores por omissão, não 404', function () {
    $user = User::factory()->create();

    $this->actingAs($user, 'sanctum')->getJson('/api/v1/preferences')
        ->assertOk()->assertJsonPath('data.dietaryRestrictions', []);
});

test('atualizar preferências grava e devolve o novo valor', function () {
    $user = User::factory()->create();

    // 201, não 200: é a 1ª vez que este user grava preferências (linha
    // criada agora) — JsonResource marca 201 sozinho quando o model
    // subjacente `wasRecentlyCreated` (mesmo comportamento já visto em
    // PartnerApplicationController::approve).
    $this->actingAs($user, 'sanctum')->putJson('/api/v1/preferences', [
        'dietary_restrictions' => ['vegetarian'], 'language' => 'en', 'notifications_enabled' => false,
    ])->assertStatus(201)
        ->assertJsonPath('data.dietaryRestrictions', ['vegetarian'])
        ->assertJsonPath('data.language', 'en')
        ->assertJsonPath('data.notificationsEnabled', false);

    // Persistiu mesmo (2ª leitura, não só o eco da resposta do PUT).
    $this->actingAs($user, 'sanctum')->getJson('/api/v1/preferences')
        ->assertOk()->assertJsonPath('data.language', 'en');
});
