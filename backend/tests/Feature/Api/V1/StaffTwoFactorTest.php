<?php

use App\Mail\TwoFactorChangedMail;
use App\Models\Restaurant;
use App\Models\SystemSecurityEvent;
use App\Models\User;
use App\Services\TwoFactorService;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use PragmaRX\Google2FA\Google2FA;

/*
 * 2FA opcional da equipa do restaurante (StaffTwoFactorController).
 */

beforeEach(function () {
    Mail::fake();
    $this->withoutMiddleware(ThrottleRequests::class);
});

function staffMember(): User
{
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);
    $owner->update(['email' => 'dono@restaurante.ao']);

    return $owner;
}

function enableStaff2fa(User $user): string
{
    $secret = app(Google2FA::class)->generateSecretKey(32);
    $user->forceFill(['two_factor_secret' => $secret, 'two_factor_confirmed_at' => now()])->save();

    return $secret;
}

function staffOtp(string $secret): string
{
    return app(Google2FA::class)->getCurrentOtp($secret);
}

test('sem 2FA, o login da equipa continua igual (token direto)', function () {
    staffMember();

    $this->postJson('/api/v1/auth/login', ['email' => 'dono@restaurante.ao', 'password' => 'password'])
        ->assertOk()
        ->assertJsonPath('data.user.twoFactorEnabled', false)
        ->assertJsonStructure(['data' => ['token']]);
});

test('ativar: setup + confirm com código certo liga o 2FA, termina as outras sessões e avisa por email', function () {
    $user = staffMember();
    $other = $user->createToken('outro-dispositivo')->plainTextToken;
    $token = $user->createToken('este')->plainTextToken;

    $secret = $this->withToken($token)->postJson('/api/v1/auth/2fa/setup')->assertOk()->json('data.secret');
    $this->withToken($token)->postJson('/api/v1/auth/2fa/confirm', ['code' => '000000'])->assertStatus(422);

    $this->withToken($token)->postJson('/api/v1/auth/2fa/confirm', ['code' => staffOtp($secret)])
        ->assertOk()
        ->assertJsonCount(8, 'data.recoveryCodes');

    expect($user->fresh()->hasTwoFactorEnabled())->toBeTrue()
        ->and(DB::table('personal_access_tokens')->where('tokenable_id', $user->id)->count())->toBe(1);
    $this->app['auth']->forgetGuards();
    $this->withToken($other)->getJson('/api/v1/auth/me')->assertUnauthorized();
    Mail::assertQueued(TwoFactorChangedMail::class, fn ($m) => $m->enabled && $m->hasTo('dono@restaurante.ao'));
});

test('com 2FA ligado, a senha certa só dá challenge e o token sai no verify', function () {
    $user = staffMember();
    $secret = enableStaff2fa($user);

    $challenge = $this->postJson('/api/v1/auth/login', ['email' => 'dono@restaurante.ao', 'password' => 'password'])
        ->assertOk()
        ->assertJsonPath('data.twoFactor', 'required')
        ->assertJsonMissingPath('data.token')
        ->json('data.challenge');

    $this->postJson('/api/v1/auth/2fa/verify', ['challenge' => $challenge, 'code' => '000000'])
        ->assertStatus(422)
        ->assertJsonPath('attemptsLeft', TwoFactorService::MAX_CHALLENGE_ATTEMPTS - 1);

    $this->postJson('/api/v1/auth/2fa/verify', ['challenge' => $challenge, 'code' => staffOtp($secret)])
        ->assertOk()
        ->assertJsonPath('data.user.restaurants.0.roleInRestaurant', 'owner')
        ->assertJsonStructure(['data' => ['token']]);

    // Nada disto é auditoria de SISTEMA nem alerta à equipa Luku.
    expect(SystemSecurityEvent::query()->count())->toBe(0);
});

test('código de recuperação entra uma vez', function () {
    $user = staffMember();
    enableStaff2fa($user);
    $codes = app(TwoFactorService::class)->regenerateRecoveryCodes($user);
    $login = fn () => $this->postJson('/api/v1/auth/login', ['email' => 'dono@restaurante.ao', 'password' => 'password'])->json('data.challenge');

    $this->postJson('/api/v1/auth/2fa/verify', ['challenge' => $login(), 'recovery_code' => $codes[0]])
        ->assertOk()
        ->assertJsonPath('data.recoveryCodesLeft', 7);
    $this->postJson('/api/v1/auth/2fa/verify', ['challenge' => $login(), 'recovery_code' => $codes[0]])
        ->assertStatus(422);
});

test('challenge de operador não serve no verify da equipa (e vice-versa)', function () {
    $operator = User::factory()->systemOperator()->create(['email' => 'op@luku.ao']);
    enableStaff2fa($operator);
    $challenge = app(TwoFactorService::class)->createChallenge($operator, 'required');

    $this->postJson('/api/v1/auth/2fa/verify', ['challenge' => $challenge, 'code' => '123456'])->assertUnauthorized();
});

test('desligar exige um código; sem ele, o token de sessão não chega', function () {
    $user = staffMember();
    $secret = enableStaff2fa($user);
    $token = $user->createToken('t')->plainTextToken;

    $this->withToken($token)->postJson('/api/v1/auth/2fa/disable', ['code' => '000000'])->assertStatus(422);
    expect($user->fresh()->hasTwoFactorEnabled())->toBeTrue();

    $this->withToken($token)->postJson('/api/v1/auth/2fa/disable', ['code' => staffOtp($secret)])->assertOk();
    expect($user->fresh()->hasTwoFactorEnabled())->toBeFalse()
        ->and($user->fresh()->two_factor_secret)->toBeNull();
    Mail::assertQueued(TwoFactorChangedMail::class, fn ($m) => ! $m->enabled);
});

test('cliente e operador não usam o 2FA da equipa', function () {
    $customer = User::factory()->create();
    $operator = User::factory()->systemOperator()->create();

    $this->actingAs($customer, 'sanctum')->postJson('/api/v1/auth/2fa/setup')->assertForbidden();
    $this->actingAs($operator, 'sanctum')->postJson('/api/v1/auth/2fa/setup')->assertForbidden();
});

test('o email de aviso renderiza nos dois sentidos', function (bool $enabled) {
    $user = User::factory()->restaurantStaff()->create(['name' => 'Rui']);

    expect((new TwoFactorChangedMail($user, $enabled))->render())->toContain('Rui');
})->with([true, false]);
