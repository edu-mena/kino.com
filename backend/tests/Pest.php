<?php

use App\Models\Restaurant;
use App\Models\User;
use Firebase\JWT\JWT;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| The closure you provide to your test functions is always bound to a specific PHPUnit test
| case class. By default, that class is "PHPUnit\Framework\TestCase". Of course, you may
| need to change it using the "pest()" function to bind different classes or traits.
|
*/

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');

pest()->extend(TestCase::class)
    ->in('Unit');

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
|
| When you're writing tests, you often need to check that values meet certain conditions. The
| "expect()" function gives you access to a set of "expectations" methods that you can use
| to assert different things. Of course, you may extend the Expectation API at any time.
|
*/

expect()->extend('toBeOne', function () {
    return $this->toBe(1);
});

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
|
| While Pest is very powerful out-of-the-box, you may have some testing code specific to your
| project that you don't want to repeat in every file. Here you can also expose helpers as
| global functions to help you to reduce the number of lines of code in your test files.
|
*/

/** Cria e devolve um user restaurant_staff com role_in_restaurant=owner
 * para o restaurante dado — usado em vários testes de Fase 1+ que precisam
 * de um dono autenticado. */
function ownerOf(Restaurant $restaurant): User
{
    $owner = User::factory()->restaurantStaff()->create();
    $owner->restaurantUsers()->create(['restaurant_id' => $restaurant->id, 'role_in_restaurant' => 'owner']);

    return $owner;
}

/**
 * id_token do Google assinado de verdade (RS256) com uma chave de teste, e o
 * endpoint de chaves públicas do Google simulado com a chave correspondente
 * — o GoogleOAuthService valida a assinatura localmente (sem `tokeninfo`).
 * Claims por omissão: emissor Google, válido 1h, email verificado.
 */
function googleTestKey()
{
    static $key = null;

    // Chave fixa SÓ de teste (tests/fixtures) — gerar uma com openssl_pkey_new
    // falha no PHP de Windows sem openssl.cnf; e assim é mais rápido.
    return $key ??= openssl_pkey_get_private(file_get_contents(__DIR__.'/fixtures/google-test-key.pem'));
}

/** Assina um payload exatamente como dado (sem claims por omissão). */
function googleIdTokenFromPayload(array $payload): string
{
    return JWT::encode($payload, googleTestKey(), 'RS256', 'test-kid');
}

function googleIdToken(array $claims = []): string
{
    $key = googleTestKey();
    $details = openssl_pkey_get_details($key);
    $b64 = fn (string $bin) => rtrim(strtr(base64_encode($bin), '+/', '-_'), '=');

    Http::fake(['www.googleapis.com/oauth2/v3/certs' => Http::response(['keys' => [[
        'kty' => 'RSA', 'alg' => 'RS256', 'use' => 'sig', 'kid' => 'test-kid',
        'n' => $b64($details['rsa']['n']), 'e' => $b64($details['rsa']['e']),
    ]]])]);

    return JWT::encode([
        'iss' => 'https://accounts.google.com',
        'aud' => config('services.google.web_client_id'),
        'iat' => time(),
        'exp' => time() + 3600,
        'email_verified' => true,
        ...$claims,
    ], $key, 'RS256', 'test-kid');
}
