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

test('aceita uma subscrição web push de tamanho real (mais de 255 caracteres)', function () {
    $user = User::factory()->create();
    // Formato e tamanho reais do Chrome/FCM — antes o INSERT rebentava com
    // 500 (coluna varchar(255)) e ativar as notificações dava sempre erro.
    $subscription = [
        'endpoint' => 'https://fcm.googleapis.com/fcm/send/'.str_repeat('c75EUsivLJc:APA91bHF9CWh_X5dHWZYb64fpTQxd9g', 4),
        'keys' => [
            'p256dh' => 'BO_bJEJJwJwkBhwI-jJ_HbFzrIEq19G0MgluosCvbrgSRO16BAJhDaGplbB8ZW5BU3yTnLH4BtuNvGGx8JDdRcs',
            'auth' => 'GwZgWvR-dE0fY8NX36QGUw',
        ],
    ];
    expect(strlen(json_encode($subscription)))->toBeGreaterThan(255);

    $this->actingAs($user, 'sanctum')
        ->postJson('/api/v1/device-tokens', ['platform' => 'web', 'subscription' => $subscription])
        ->assertStatus(204);

    expect(DeviceToken::query()->where('user_id', $user->id)->count())->toBe(1);
});
