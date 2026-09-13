<?php

use App\Models\PartnerApplication;
use App\Models\Restaurant;
use App\Models\User;
use Illuminate\Support\Facades\Password;

test('qualquer um pode candidatar-se, sem autenticação', function () {
    $response = $this->postJson('/api/v1/partner-applications', [
        'restaurant_name' => 'Sabores de Luanda',
        'owner_name' => 'Maria João',
        'phone' => '923000000',
        'email' => 'maria@example.com',
        'province' => 'Luanda',
    ]);

    $response->assertStatus(201)->assertJsonPath('data.status', 'pending');
});

test('staff/customer não pode listar nem decidir candidaturas — só system_operator', function () {
    $app = PartnerApplication::factory()->create();
    $customer = User::factory()->create();

    $this->actingAs($customer, 'sanctum')->getJson('/api/v1/partner-applications')->assertForbidden();
    $this->actingAs($customer, 'sanctum')
        ->postJson("/api/v1/partner-applications/{$app->uuid}/approve")
        ->assertForbidden();
});

test('aprovar cria restaurante+subscrição trial+3 mesas+conta do dono, e marca a candidatura', function () {
    Password::shouldReceive('sendResetLink')->once()->andReturn('reset-link-sent');
    $operator = User::factory()->systemOperator()->create();
    $app = PartnerApplication::factory()->create(['email' => 'novo-dono@example.com']);

    $response = $this->actingAs($operator, 'sanctum')
        ->postJson("/api/v1/partner-applications/{$app->uuid}/approve");

    $response->assertStatus(201); // JsonResource marca 201 sozinho quando o model foi mesmo criado agora
    $restaurantUuid = $response->json('data.id');
    $restaurant = Restaurant::query()->where('uuid', $restaurantUuid)->firstOrFail();

    expect($restaurant->tables()->count())->toBe(3);
    expect($restaurant->subscription->status)->toBe('trial');
    expect($restaurant->subscription->plan)->toBe('luku');

    $owner = User::query()->where('email', 'novo-dono@example.com')->firstOrFail();
    expect($owner->role)->toBe('restaurant_staff');
    expect($owner->restaurantUsers()->where('restaurant_id', $restaurant->id)->first()->role_in_restaurant)
        ->toBe('owner');

    expect($app->fresh())
        ->status->toBe('approved')
        ->created_restaurant_id->toBe($restaurant->id);
});

test('aprovar uma candidatura já decidida falha (não duplica restaurante)', function () {
    $operator = User::factory()->systemOperator()->create();
    $app = PartnerApplication::factory()->create(['status' => 'approved']);

    $this->actingAs($operator, 'sanctum')
        ->postJson("/api/v1/partner-applications/{$app->uuid}/approve")
        ->assertStatus(422);
});

test('aprovar com email já existente liga à conta em vez de duplicar', function () {
    Password::shouldReceive('sendResetLink')->never();
    $operator = User::factory()->systemOperator()->create();
    $existingOwner = User::factory()->restaurantStaff()->create(['email' => 'ja-existe@example.com']);
    $app = PartnerApplication::factory()->create(['email' => 'ja-existe@example.com']);

    $this->actingAs($operator, 'sanctum')
        ->postJson("/api/v1/partner-applications/{$app->uuid}/approve")
        ->assertStatus(201);

    expect(User::query()->where('email', 'ja-existe@example.com')->count())->toBe(1);
    $restaurant = $existingOwner->fresh()->restaurantUsers()->first()->restaurant;
    expect($restaurant->uuid)->toBe($app->fresh()->createdRestaurant->uuid);
});

test('rejeitar candidatura não cria restaurante nenhum', function () {
    $operator = User::factory()->systemOperator()->create();
    $app = PartnerApplication::factory()->create();

    $this->actingAs($operator, 'sanctum')
        ->postJson("/api/v1/partner-applications/{$app->uuid}/reject")
        ->assertOk()->assertJsonPath('data.status', 'rejected');

    expect($app->fresh()->created_restaurant_id)->toBeNull();
});
