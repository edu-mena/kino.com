<?php

use App\Models\SavedAddress;
use App\Models\User;

test('cliente cria, lista e apaga a própria morada', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user, 'sanctum')->postJson('/api/v1/saved-addresses', [
        'label' => 'Casa', 'line1' => 'Rua X, 123',
    ]);
    $response->assertStatus(201)->assertJsonPath('data.label', 'Casa');

    $this->actingAs($user, 'sanctum')->getJson('/api/v1/saved-addresses')->assertOk()->assertJsonCount(1, 'data');

    $addressUuid = $response->json('data.id');
    $this->actingAs($user, 'sanctum')->deleteJson("/api/v1/saved-addresses/{$addressUuid}")->assertStatus(204);
    $this->actingAs($user, 'sanctum')->getJson('/api/v1/saved-addresses')->assertOk()->assertJsonCount(0, 'data');
});

test('marcar uma morada como default desmarca as outras', function () {
    $user = User::factory()->create();
    $first = SavedAddress::factory()->for($user)->create(['is_default' => true]);

    $response = $this->actingAs($user, 'sanctum')->postJson('/api/v1/saved-addresses', [
        'label' => 'Trabalho', 'line1' => 'Nova morada', 'is_default' => true,
    ]);

    $response->assertStatus(201)->assertJsonPath('data.isDefault', true);
    expect($first->fresh()->is_default)->toBeFalse();
});

test('cliente não edita/apaga morada de outra conta', function () {
    $owner = User::factory()->create();
    $intruder = User::factory()->create();
    $address = SavedAddress::factory()->for($owner)->create();

    $this->actingAs($intruder, 'sanctum')
        ->patchJson("/api/v1/saved-addresses/{$address->uuid}", ['line1' => 'Hackeado'])
        ->assertForbidden();

    $this->actingAs($intruder, 'sanctum')
        ->deleteJson("/api/v1/saved-addresses/{$address->uuid}")
        ->assertForbidden();
});
