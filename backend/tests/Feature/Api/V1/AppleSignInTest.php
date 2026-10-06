<?php

use App\Models\User;
use Firebase\JWT\JWT;
use Illuminate\Support\Facades\Http;

/*
 * "Iniciar sessão com Apple" (App Store 4.8) — AuthController::appleCallback.
 */

beforeEach(function () {
    config(['services.apple.client_ids' => 'com.luku.app']);
});

function configureAppleRevocation(): void
{
    config([
        'services.apple.team_id' => 'TEAM123456',
        'services.apple.key_id' => 'KEY1234567',
        'services.apple.private_key' => file_get_contents(base_path('tests/fixtures/apple-test-key.p8')),
    ]);
}

test('primeiro login com Apple cria o cliente com o nome que a app enviou', function () {
    $this->postJson('/api/v1/auth/apple/callback', [
        'id_token' => appleIdToken(['sub' => 'apple-001', 'email' => 'Ana@privaterelay.appleid.com']),
        'given_name' => 'Ana',
        'family_name' => 'Silva',
    ])->assertOk()->assertJsonPath('data.user.role', 'customer')->assertJsonPath('data.user.name', 'Ana Silva');

    expect(User::query()->where('apple_id', 'apple-001')->value('email'))->toBe('ana@privaterelay.appleid.com');
});

test('logins seguintes (sem nome nem email) reencontram a conta pelo sub da Apple', function () {
    $user = User::factory()->create(['apple_id' => 'apple-001']);

    $this->postJson('/api/v1/auth/apple/callback', ['id_token' => appleIdToken(['sub' => 'apple-001'])])
        ->assertOk()
        ->assertJsonPath('data.user.email', $user->email);

    expect(User::query()->count())->toBe(1);
});

test('liga à conta de cliente que já existe com o mesmo email verificado', function () {
    $user = User::factory()->create(['email' => 'ana@example.com', 'google_id' => 'google-1']);

    $this->postJson('/api/v1/auth/apple/callback', [
        'id_token' => appleIdToken(['sub' => 'apple-002', 'email' => 'ana@example.com']),
    ])->assertOk();

    expect($user->fresh()->apple_id)->toBe('apple-002')->and(User::query()->count())->toBe(1);
});

test('email por verificar não liga a conta alheia nem cria conta', function () {
    $victim = User::factory()->create(['email' => 'vitima@example.com']);

    $this->postJson('/api/v1/auth/apple/callback', [
        'id_token' => appleIdToken(['sub' => 'apple-x', 'email' => 'vitima@example.com', 'email_verified' => 'false']),
    ])->assertStatus(422);

    expect($victim->fresh()->apple_id)->toBeNull()->and(User::query()->count())->toBe(1);
});

test('rejeita token de outra app, de outro emissor, expirado ou forjado', function (Closure $token) {
    $this->postJson('/api/v1/auth/apple/callback', ['id_token' => $token()])->assertStatus(422);

    expect(User::query()->count())->toBe(0);
})->with([
    'outra app' => [fn () => appleIdToken(['sub' => 'a', 'email' => 'a@x.com', 'aud' => 'com.outra.app'])],
    'outro emissor' => [fn () => appleIdToken(['sub' => 'a', 'email' => 'a@x.com', 'iss' => 'https://evil.example'])],
    'expirado' => [fn () => appleIdToken(['sub' => 'a', 'email' => 'a@x.com', 'iat' => time() - 7200, 'exp' => time() - 3600])],
    'forjado' => [function () {
        fakeJwks('appleid.apple.com/auth/keys');
        $other = openssl_pkey_get_private(file_get_contents(base_path('tests/fixtures/other-test-key.pem')));

        return JWT::encode([
            'iss' => 'https://appleid.apple.com', 'aud' => 'com.luku.app', 'iat' => time(),
            'exp' => time() + 3600, 'sub' => 'a', 'email' => 'a@x.com', 'email_verified' => 'true',
        ], $other, 'RS256', 'test-kid');
    }],
]);

test('nonce tem de bater (em claro ou em SHA-256)', function () {
    $nonce = 'nonce-aleatorio-123';

    $this->postJson('/api/v1/auth/apple/callback', [
        'id_token' => appleIdToken(['sub' => 'a1', 'email' => 'a1@x.com', 'nonce' => hash('sha256', $nonce)]),
        'nonce' => $nonce,
    ])->assertOk();

    $this->postJson('/api/v1/auth/apple/callback', [
        'id_token' => appleIdToken(['sub' => 'a2', 'email' => 'a2@x.com', 'nonce' => 'outro']),
        'nonce' => $nonce,
    ])->assertStatus(422);
});

test('com a chave .p8 configurada, guarda o refresh token e revoga-o ao apagar a conta', function () {
    configureAppleRevocation();
    $idToken = appleIdToken(['sub' => 'apple-rev', 'email' => 'rev@example.com']);
    Http::fake([
        'appleid.apple.com/auth/token' => Http::response(['refresh_token' => 'refresh-abc']),
        'appleid.apple.com/auth/revoke' => Http::response(),
    ]);

    $token = $this->postJson('/api/v1/auth/apple/callback', [
        'id_token' => $idToken, 'authorization_code' => 'code-xyz',
    ])->assertOk()->json('data.token');

    $user = User::query()->where('apple_id', 'apple-rev')->first();
    expect($user->apple_token)->toBe(['refresh_token' => 'refresh-abc', 'client_id' => 'com.luku.app']);

    $this->withToken($token)->deleteJson('/api/v1/me', ['confirm' => true])->assertOk();

    Http::assertSent(fn ($r) => $r->url() === 'https://appleid.apple.com/auth/revoke'
        && $r['token'] === 'refresh-abc'
        && $r['client_id'] === 'com.luku.app'
        // client_secret é um JWT ES256 com o Team ID como emissor.
        && JWT::jsonDecode(JWT::urlsafeB64Decode(explode('.', $r['client_secret'])[1]))->iss === 'TEAM123456');
});

test('sem a chave .p8, o login funciona e não tenta trocar o código', function () {
    $this->postJson('/api/v1/auth/apple/callback', [
        'id_token' => appleIdToken(['sub' => 'apple-s', 'email' => 's@example.com']),
        'authorization_code' => 'code-xyz',
    ])->assertOk();

    Http::assertNotSent(fn ($r) => str_contains($r->url(), '/auth/token'));
});
