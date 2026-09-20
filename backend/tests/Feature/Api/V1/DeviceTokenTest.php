<?php

use App\Models\DeviceToken;
use App\Models\User;

test('cliente regista uma subscrição web push', function () {
    $user = User::factory()->create();

    $this->actingAs($user, 'sanctum')
        ->postJson('/api/v1/device-tokens', [
            'platform' => 'web',
            'subscription' => [
                'endpoint' => 'https://fcm.googleapis.com/fcm/send/abc123',
                'keys' => ['p256dh' => 'p256dh-key', 'auth' => 'auth-key'],
            ],
            'device_name' => 'Chrome no Windows',
        ])
        ->assertStatus(204);

    expect(DeviceToken::query()->where('user_id', $user->id)->count())->toBe(1);
    $stored = DeviceToken::query()->where('user_id', $user->id)->first();
    expect($stored->platform)->toBe('web');
    expect(json_decode($stored->token, true))->toMatchArray([
        'endpoint' => 'https://fcm.googleapis.com/fcm/send/abc123',
    ]);
});

test('registar a mesma subscrição duas vezes não duplica', function () {
    $user = User::factory()->create();
    $payload = [
        'platform' => 'web',
        'subscription' => [
            'endpoint' => 'https://fcm.googleapis.com/fcm/send/abc123',
            'keys' => ['p256dh' => 'p256dh-key', 'auth' => 'auth-key'],
        ],
    ];

    $this->actingAs($user, 'sanctum')->postJson('/api/v1/device-tokens', $payload)->assertStatus(204);
    $this->actingAs($user, 'sanctum')->postJson('/api/v1/device-tokens', $payload)->assertStatus(204);

    expect(DeviceToken::query()->where('user_id', $user->id)->count())->toBe(1);
});

test('cliente remove a própria subscrição', function () {
    $user = User::factory()->create();
    $subscription = [
        'endpoint' => 'https://fcm.googleapis.com/fcm/send/abc123',
        'keys' => ['p256dh' => 'p256dh-key', 'auth' => 'auth-key'],
    ];

    $this->actingAs($user, 'sanctum')->postJson('/api/v1/device-tokens', [
        'platform' => 'web',
        'subscription' => $subscription,
    ])->assertStatus(204);

    $this->actingAs($user, 'sanctum')
        ->deleteJson('/api/v1/device-tokens', ['platform' => 'web', 'subscription' => $subscription])
        ->assertStatus(204);

    expect(DeviceToken::query()->where('user_id', $user->id)->count())->toBe(0);
});

test('token android/ios exige o campo token, não subscription', function () {
    $user = User::factory()->create();

    $this->actingAs($user, 'sanctum')
        ->postJson('/api/v1/device-tokens', ['platform' => 'android', 'token' => 'fcm-token-abc'])
        ->assertStatus(204);

    expect(DeviceToken::query()->where('user_id', $user->id)->first()->token)->toBe('fcm-token-abc');
});

test('exige autenticação', function () {
    $this->postJson('/api/v1/device-tokens', ['platform' => 'web'])->assertStatus(401);
});
