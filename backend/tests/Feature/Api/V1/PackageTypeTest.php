<?php

use App\Models\PackageType;
use App\Models\Restaurant;
use App\Models\RestaurantPackage;
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

// --- descoberta pública por tipo de pacote (Fase L3d) ---

test('with_offers só mostra tipos com pelo menos um pacote de restaurante ativo', function () {
    $withOffer = PackageType::factory()->create(['name' => 'Aniversário']);
    PackageType::factory()->create(['name' => 'Sem oferta nenhuma']);
    $onlyInactiveOffer = PackageType::factory()->create(['name' => 'Só oferta inativa']);
    $restaurant = Restaurant::factory()->create();
    RestaurantPackage::factory()->for($restaurant)->create(['package_type_id' => $withOffer->id, 'is_active' => true]);
    RestaurantPackage::factory()->for($restaurant)->create(['package_type_id' => $onlyInactiveOffer->id, 'is_active' => false]);

    $response = $this->getJson('/api/v1/package-types?with_offers=1');

    $response->assertOk()->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Aniversário');
});

test('o seletor de tipo na gestão de sala continua a ver tipos sem nenhuma oferta ainda', function () {
    PackageType::factory()->create(['name' => 'Tipo Novo, Zero Ofertas']);

    $this->getJson('/api/v1/package-types')
        ->assertOk()->assertJsonCount(1, 'data');
});

test('restaurantes que oferecem um tipo, só ativos, com o restaurante carregado', function () {
    $type = PackageType::factory()->create(['name' => 'Aniversário']);
    $otherType = PackageType::factory()->create();
    $restaurant = Restaurant::factory()->create(['name' => 'Sabores de Luanda', 'lat' => -8.83, 'lng' => 13.23]);
    $otherRestaurant = Restaurant::factory()->create();
    $active = RestaurantPackage::factory()->for($restaurant)->create([
        'package_type_id' => $type->id, 'is_active' => true, 'title' => 'Aniversário Infantil',
    ]);
    RestaurantPackage::factory()->for($restaurant)->create(['package_type_id' => $type->id, 'is_active' => false]);
    RestaurantPackage::factory()->for($otherRestaurant)->create(['package_type_id' => $otherType->id, 'is_active' => true]);

    $response = $this->getJson("/api/v1/package-types/{$type->uuid}/restaurants");

    $response->assertOk()->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $active->uuid)
        ->assertJsonPath('data.0.title', 'Aniversário Infantil')
        ->assertJsonPath('data.0.restaurant.name', 'Sabores de Luanda')
        ->assertJsonPath('data.0.restaurant.lat', -8.83)
        ->assertJsonPath('data.0.restaurant.lng', 13.23);
});
