<?php

use App\Models\MenuItem;
use App\Models\User;

test('cliente favorita, lista e remove um prato', function () {
    $item = MenuItem::factory()->create();
    $user = User::factory()->create();

    $this->actingAs($user, 'sanctum')
        ->postJson("/api/v1/menu-items/{$item->uuid}/favorite")
        ->assertOk()
        ->assertJsonPath('data', [$item->uuid]);

    $this->actingAs($user, 'sanctum')
        ->getJson('/api/v1/favorites/menu-items')
        ->assertOk()
        ->assertJsonPath('data', [$item->uuid]);

    $this->actingAs($user, 'sanctum')
        ->deleteJson("/api/v1/menu-items/{$item->uuid}/favorite")
        ->assertOk()
        ->assertJsonPath('data', []);
});

test('favoritar duas vezes não duplica', function () {
    $item = MenuItem::factory()->create();
    $user = User::factory()->create();

    $this->actingAs($user, 'sanctum')->postJson("/api/v1/menu-items/{$item->uuid}/favorite")->assertOk();
    $this->actingAs($user, 'sanctum')->postJson("/api/v1/menu-items/{$item->uuid}/favorite")->assertOk();

    expect($user->favoriteMenuItems()->count())->toBe(1);
});

test('convidado não favorita no servidor', function () {
    $item = MenuItem::factory()->create();

    $this->postJson("/api/v1/menu-items/{$item->uuid}/favorite")->assertUnauthorized();
});

test('favoritos são só os do próprio user', function () {
    $item = MenuItem::factory()->create();
    $userA = User::factory()->create();
    $userB = User::factory()->create();

    $this->actingAs($userA, 'sanctum')->postJson("/api/v1/menu-items/{$item->uuid}/favorite");

    $this->actingAs($userB, 'sanctum')->getJson('/api/v1/favorites/menu-items')->assertOk()->assertJsonPath('data', []);
});

test('sync junta os favoritos do browser e ignora ids desconhecidos', function () {
    $kept = MenuItem::factory()->create();
    $fromBrowser = MenuItem::factory()->create();
    $user = User::factory()->create();
    $user->favoriteMenuItems()->attach($kept->id);

    $response = $this->actingAs($user, 'sanctum')
        ->postJson('/api/v1/favorites/menu-items/sync', ['ids' => [$fromBrowser->uuid, 'nao-existe']])
        ->assertOk();

    expect($response->json('data'))->toEqualCanonicalizing([$kept->uuid, $fromBrowser->uuid]);
});

test('sync recusa listas demasiado grandes', function () {
    $user = User::factory()->create();

    $this->actingAs($user, 'sanctum')
        ->postJson('/api/v1/favorites/menu-items/sync', ['ids' => array_fill(0, 201, 'x')])
        ->assertUnprocessable();
});
