<?php

use App\Models\Restaurant;
use App\Models\User;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    // 3 client_ids distintos (um por plataforma) — ver GoogleOAuthService.
    // Vazios por default no ambiente de teste; sem isto todo `aud` seria
    // rejeitado (array de audiências permitidas ficaria vazio).
    config([
        'services.google.web_client_id' => 'web-client-id',
        'services.google.android_client_id' => 'android-client-id',
        'services.google.ios_client_id' => 'ios-client-id',
    ]);
});

test('google code flow troca o code com redirect_uri=postmessage (exigido pelo popup do GIS)', function () {
    // Regressão de bug encontrado em revisão cruzada: o popup do Google
    // Identity Services emite o `code` sempre contra o pseudo-redirect
    // 'postmessage', nunca contra a origem da página — trocar o code com
    // qualquer outro redirect_uri falha com redirect_uri_mismatch no
    // Google. O servidor tem de fixar 'postmessage' sozinho, não confiar em
    // nada vindo do cliente para isto (o cliente nem envia redirect_uri).
    Http::fake([
        'oauth2.googleapis.com/token' => Http::response(['id_token' => 'fake-id-token']),
        'oauth2.googleapis.com/tokeninfo*' => Http::response([
            'sub' => 'google-code-1',
            'email' => 'code-flow@example.com',
            'name' => 'Code Flow',
            'aud' => config('services.google.web_client_id'),
        ]),
    ]);

    $response = $this->postJson('/api/v1/auth/google/callback', ['code' => 'fake-auth-code']);

    $response->assertOk()->assertJsonPath('data.user.email', 'code-flow@example.com');
    Http::assertSent(fn ($request) => $request->url() === 'https://oauth2.googleapis.com/token'
        && $request['redirect_uri'] === 'postmessage'
        && $request['client_id'] === config('services.google.web_client_id'));
});

test('google id_token cria um novo customer e devolve token', function () {
    Http::fake([
        'oauth2.googleapis.com/tokeninfo*' => Http::response([
            'sub' => 'google-123',
            'email' => 'ana@example.com',
            'name' => 'Ana',
            'picture' => 'https://example.com/ana.jpg',
            'aud' => config('services.google.web_client_id'),
        ]),
    ]);

    $response = $this->postJson('/api/v1/auth/google/callback', ['id_token' => 'fake-token']);

    $response->assertOk()->assertJsonPath('data.user.email', 'ana@example.com');
    expect(User::query()->where('email', 'ana@example.com')->first())
        ->role->toBe('customer')
        ->google_id->toBe('google-123');
});

test('google login reutiliza a conta existente pelo google_id', function () {
    $user = User::factory()->create(['google_id' => 'google-123']);

    Http::fake([
        'oauth2.googleapis.com/tokeninfo*' => Http::response([
            'sub' => 'google-123',
            'email' => $user->email,
            'name' => $user->name,
            'aud' => config('services.google.web_client_id'),
        ]),
    ]);

    $this->postJson('/api/v1/auth/google/callback', ['id_token' => 'fake-token'])->assertOk();

    expect(User::query()->where('google_id', 'google-123')->count())->toBe(1);
});

test('google login funciona com id_token emitido para o client_id Android ou iOS, não só Web', function (string $configKey) {
    // Regressão do bug encontrado em revisão cruzada: o id_token do Google
    // Sign-In nativo (Android/iOS) tem `aud` = client_id daquela plataforma,
    // não o client_id Web usado no authorization-code flow — a validação
    // tem de aceitar qualquer um dos três, não só um.
    Http::fake([
        'oauth2.googleapis.com/tokeninfo*' => Http::response([
            'sub' => 'google-mobile-1',
            'email' => 'mobile@example.com',
            'name' => 'User Mobile',
            'aud' => config("services.google.{$configKey}"),
        ]),
    ]);

    $this->postJson('/api/v1/auth/google/callback', ['id_token' => 'fake-token'])
        ->assertOk()
        ->assertJsonPath('data.user.email', 'mobile@example.com');
})->with(['android_client_id', 'ios_client_id']);

test('google callback rejeita id_token cuja audiência não bate com o client_id configurado', function () {
    Http::fake([
        'oauth2.googleapis.com/tokeninfo*' => Http::response([
            'sub' => 'google-999', 'email' => 'x@example.com', 'name' => 'X', 'aud' => 'outro-client-id',
        ]),
    ]);

    $this->postJson('/api/v1/auth/google/callback', ['id_token' => 'fake-token'])->assertStatus(422);
});

test('customer não consegue autenticar via /auth/login (só staff/operator)', function () {
    User::factory()->create(['email' => 'cliente@example.com']); // role=customer, sem password

    $this->postJson('/api/v1/auth/login', [
        'email' => 'cliente@example.com',
        'password' => 'password',
    ])->assertStatus(401);
});

test('staff autentica com email+senha corretos', function () {
    User::factory()->restaurantStaff()->create(['email' => 'dono@restaurante.com']);

    $this->postJson('/api/v1/auth/login', [
        'email' => 'dono@restaurante.com',
        'password' => 'password',
    ])->assertOk()->assertJsonPath('data.user.role', 'restaurant_staff');
});

test('staff com senha errada recebe mensagem genérica (não revela se o email existe)', function () {
    User::factory()->restaurantStaff()->create(['email' => 'dono@restaurante.com']);

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => 'dono@restaurante.com',
        'password' => 'errada',
    ]);

    $response->assertStatus(401)->assertJson(['message' => 'Credenciais inválidas.']);
});

test('logout revoga só o token atual, logout-all revoga todos', function () {
    $user = User::factory()->restaurantStaff()->create();
    $tokenA = $user->createToken('device-a', [$user->role])->plainTextToken;
    $user->createToken('device-b', [$user->role]);

    expect($user->tokens()->count())->toBe(2);

    $this->withHeader('Authorization', "Bearer {$tokenA}")
        ->postJson('/api/v1/auth/logout')->assertOk();

    expect($user->tokens()->count())->toBe(1);

    $tokenC = $user->createToken('device-c', [$user->role])->plainTextToken;
    $this->withHeader('Authorization', "Bearer {$tokenC}")
        ->postJson('/api/v1/auth/logout-all')->assertOk();

    expect($user->tokens()->count())->toBe(0);
});

test('me devolve os restaurantes geridos quando é staff', function () {
    $user = User::factory()->restaurantStaff()->create();
    $restaurant = Restaurant::factory()->create();
    $user->restaurantUsers()->create(['restaurant_id' => $restaurant->id, 'role_in_restaurant' => 'owner']);

    $response = $this->actingAs($user, 'sanctum')->getJson('/api/v1/auth/me');

    $response->assertOk()->assertJsonPath('data.restaurants.0.restaurantId', $restaurant->uuid);
});
