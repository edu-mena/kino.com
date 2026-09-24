<?php

use App\Models\PackageType;
use App\Models\Restaurant;
use App\Models\User;

test('listagem pública só mostra tipos ativos', function () {
    PackageType::factory()->create(['name' => 'Aniversário', 'is_active' => true]);
    PackageType::factory()->create(['name' => 'Despedida de solteiro', 'is_active' => false]);

    $response = $this->getJson('/api/v1/package-types');

    $response->assertOk()->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Aniversário');
});

test('operador de sistema vê também os tipos inativos', function () {
    PackageType::factory()->create(['name' => 'Aniversário', 'is_active' => true]);
    PackageType::factory()->create(['name' => 'Despedida de solteiro', 'is_active' => false]);
    $operator = User::factory()->systemOperator()->create();

    $response = $this->actingAs($operator, 'sanctum')->getJson('/api/v1/package-types');

    $response->assertOk()->assertJsonCount(2, 'data');
});

test('só system_operator cria/edita/apaga tipos de pacote', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);

    $this->actingAs($owner, 'sanctum')
        ->postJson('/api/v1/package-types', ['name' => 'Aniversário'])
        ->assertForbidden();

    $operator = User::factory()->systemOperator()->create();

    $created = $this->actingAs($operator, 'sanctum')
        ->postJson('/api/v1/package-types', ['name' => 'Aniversário', 'icon' => 'cake']);
    $created->assertStatus(201)->assertJsonPath('data.name', 'Aniversário');
    $id = $created->json('data.id');

    $this->actingAs($owner, 'sanctum')
        ->patchJson("/api/v1/package-types/{$id}", ['name' => 'Outro nome'])
        ->assertForbidden();

    $this->actingAs($operator, 'sanctum')
        ->patchJson("/api/v1/package-types/{$id}", ['is_active' => false])
        ->assertOk()->assertJsonPath('data.isActive', false);

    $this->actingAs($owner, 'sanctum')
        ->deleteJson("/api/v1/package-types/{$id}")
        ->assertForbidden();

    $this->actingAs($operator, 'sanctum')
        ->deleteJson("/api/v1/package-types/{$id}")
        ->assertStatus(204);
});

test('não é possível criar dois tipos de pacote com o mesmo nome', function () {
    PackageType::factory()->create(['name' => 'Aniversário']);
    $operator = User::factory()->systemOperator()->create();

    $this->actingAs($operator, 'sanctum')
        ->postJson('/api/v1/package-types', ['name' => 'Aniversário'])
        ->assertStatus(422)->assertJsonValidationErrors('name');
});
