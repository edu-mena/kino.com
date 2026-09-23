<?php

use App\Models\Company;
use App\Models\User;

test('cliente cria, lista e apaga a própria empresa', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user, 'sanctum')->postJson('/api/v1/companies', [
        'name' => 'Luku Lda', 'nif' => '5417123456', 'email' => 'financeiro@luku.ao',
    ]);
    $response->assertStatus(201)
        ->assertJsonPath('data.name', 'Luku Lda')
        ->assertJsonPath('data.nif', '5417123456')
        ->assertJsonPath('data.email', 'financeiro@luku.ao');

    $this->actingAs($user, 'sanctum')->getJson('/api/v1/companies')->assertOk()->assertJsonCount(1, 'data');

    $companyUuid = $response->json('data.id');
    $this->actingAs($user, 'sanctum')->deleteJson("/api/v1/companies/{$companyUuid}")->assertStatus(204);
    $this->actingAs($user, 'sanctum')->getJson('/api/v1/companies')->assertOk()->assertJsonCount(0, 'data');
});

test('cliente não edita/apaga empresa de outra conta', function () {
    $owner = User::factory()->create();
    $intruder = User::factory()->create();
    $company = Company::factory()->for($owner)->create();

    $this->actingAs($intruder, 'sanctum')
        ->patchJson("/api/v1/companies/{$company->uuid}", ['name' => 'Hackeado'])
        ->assertForbidden();

    $this->actingAs($intruder, 'sanctum')
        ->deleteJson("/api/v1/companies/{$company->uuid}")
        ->assertForbidden();
});

test('convidado (sem sessão) não consegue criar empresa', function () {
    $this->postJson('/api/v1/companies', [
        'name' => 'Luku Lda', 'nif' => '5417123456', 'email' => 'financeiro@luku.ao',
    ])->assertStatus(401);
});
