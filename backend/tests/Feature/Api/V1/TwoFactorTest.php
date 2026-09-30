<?php

use App\Mail\SystemSecurityAlertMail;
use App\Models\BlockedIp;
use App\Models\SystemSecurityEvent;
use App\Models\User;
use App\Services\TwoFactorService;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use PragmaRX\Google2FA\Google2FA;

beforeEach(fn () => Mail::fake());

function operatorWithTwoFactor(): array
{
    $secret = app(Google2FA::class)->generateSecretKey(32);
    $user = User::factory()->systemOperator()->create(['email' => 'op@luku.ao']);
    $user->forceFill(['two_factor_secret' => $secret, 'two_factor_confirmed_at' => now()])->save();

    return [$user, $secret];
}

function systemChallenge($test, string $email = 'op@luku.ao'): string
{
    return $test->postJson('/api/v1/auth/system/login', ['email' => $email, 'password' => 'password'])
        ->assertOk()
        ->json('data.challenge');
}

function otp(string $secret): string
{
    return app(Google2FA::class)->getCurrentOtp($secret);
}

test('ativação: setup devolve QR, confirm com código certo ativa o 2FA e devolve token + 8 códigos de recuperação', function () {
    $user = User::factory()->systemOperator()->create(['email' => 'op@luku.ao']);
    $challenge = systemChallenge($this);

    $setup = $this->postJson('/api/v1/auth/system/2fa/setup', ['challenge' => $challenge])->assertOk();
    $secret = $setup->json('data.secret');
    expect($setup->json('data.otpauthUrl'))->toStartWith('otpauth://totp/Luku:');

    $response = $this->postJson('/api/v1/auth/system/2fa/confirm', ['challenge' => $challenge, 'code' => otp($secret)])
        ->assertOk()
        ->assertJsonPath('data.user.role', 'system_operator');

    expect($response->json('data.token'))->not->toBeEmpty()
        ->and($response->json('data.recoveryCodes'))->toHaveCount(8)
        ->and($user->fresh()->hasTwoFactorEnabled())->toBeTrue();

    // Segredo nunca em claro na BD.
    $raw = DB::table('users')->where('id', $user->id)->value('two_factor_secret');
    expect($raw)->not->toBe($secret)->and($user->fresh()->two_factor_secret)->toBe($secret);

    expect(SystemSecurityEvent::query()->where('event', 'two_factor_enabled')->count())->toBe(1);
    Mail::assertQueued(SystemSecurityAlertMail::class, fn ($m) => $m->event->event === 'two_factor_enabled');
});

test('confirm com código errado não ativa nada e conta como falha', function () {
    $user = User::factory()->systemOperator()->create(['email' => 'op@luku.ao']);
    $challenge = systemChallenge($this);
    $this->postJson('/api/v1/auth/system/2fa/setup', ['challenge' => $challenge])->assertOk();

    $this->postJson('/api/v1/auth/system/2fa/confirm', ['challenge' => $challenge, 'code' => '000000'])
        ->assertStatus(422)
        ->assertJsonPath('attemptsLeft', TwoFactorService::MAX_CHALLENGE_ATTEMPTS - 1);

    expect($user->fresh()->hasTwoFactorEnabled())->toBeFalse()
        ->and(SystemSecurityEvent::query()->where('event', 'two_factor')->where('outcome', 'failed')->count())->toBe(1);
});

test('conta com 2FA: login pede código e verify emite token de 12h', function () {
    [, $secret] = operatorWithTwoFactor();

    $login = $this->postJson('/api/v1/auth/system/login', ['email' => 'op@luku.ao', 'password' => 'password'])
        ->assertOk()
        ->assertJsonPath('data.twoFactor', 'required');

    $this->postJson('/api/v1/auth/system/2fa/verify', ['challenge' => $login->json('data.challenge'), 'code' => otp($secret)])
        ->assertOk()
        ->assertJsonPath('data.user.role', 'system_operator');

    $expiresAt = DB::table('personal_access_tokens')->value('expires_at');
    expect(now()->diffInMinutes($expiresAt))->toBeBetween(12 * 60 - 1, 12 * 60 + 1);
});

test('o mesmo código TOTP não serve duas vezes (replay)', function () {
    $this->withoutMiddleware(ThrottleRequests::class);
    [, $secret] = operatorWithTwoFactor();
    $code = otp($secret);

    $this->postJson('/api/v1/auth/system/2fa/verify', ['challenge' => systemChallenge($this), 'code' => $code])->assertOk();
    $this->postJson('/api/v1/auth/system/2fa/verify', ['challenge' => systemChallenge($this), 'code' => $code])->assertStatus(422);
});

test('código de recuperação entra uma vez e depois deixa de valer', function () {
    $this->withoutMiddleware(ThrottleRequests::class);
    [$user] = operatorWithTwoFactor();
    $codes = app(TwoFactorService::class)->regenerateRecoveryCodes($user);

    $this->postJson('/api/v1/auth/system/2fa/verify', ['challenge' => systemChallenge($this), 'recovery_code' => $codes[0]])
        ->assertOk()
        ->assertJsonPath('data.recoveryCodesLeft', 7);

    $this->postJson('/api/v1/auth/system/2fa/verify', ['challenge' => systemChallenge($this), 'recovery_code' => $codes[0]])
        ->assertStatus(422);
});

test('5 códigos errados matam o challenge — é preciso voltar a pôr a senha', function () {
    $this->withoutMiddleware(ThrottleRequests::class);
    [, $secret] = operatorWithTwoFactor();
    $challenge = systemChallenge($this);

    foreach (range(1, TwoFactorService::MAX_CHALLENGE_ATTEMPTS - 1) as $_) {
        $this->postJson('/api/v1/auth/system/2fa/verify', ['challenge' => $challenge, 'code' => '000000'])->assertStatus(422);
    }
    $this->postJson('/api/v1/auth/system/2fa/verify', ['challenge' => $challenge, 'code' => '000000'])->assertStatus(401);

    // Nem o código certo salva um challenge já morto.
    $this->postJson('/api/v1/auth/system/2fa/verify', ['challenge' => $challenge, 'code' => otp($secret)])->assertStatus(401);
});

test('códigos 2FA errados contam para o bloqueio automático do IP', function () {
    $this->withoutMiddleware(ThrottleRequests::class);
    operatorWithTwoFactor();

    foreach (range(1, 4) as $_) {
        $this->postJson('/api/v1/auth/system/login', ['email' => 'op@luku.ao', 'password' => 'errada'])->assertStatus(401);
    }
    $this->postJson('/api/v1/auth/system/2fa/verify', ['challenge' => systemChallenge($this), 'code' => '000000']);

    expect(BlockedIp::query()->where('ip', '127.0.0.1')->exists())->toBeTrue();
});

test('setup numa conta que já tem 2FA é recusado (não dá para trocar o segredo só com a senha)', function () {
    operatorWithTwoFactor();

    $this->postJson('/api/v1/auth/system/2fa/setup', ['challenge' => systemChallenge($this)])->assertStatus(401);
});

test('challenge inventado é recusado', function () {
    operatorWithTwoFactor();

    $this->postJson('/api/v1/auth/system/2fa/verify', ['challenge' => str_repeat('a', 64), 'code' => '123456'])
        ->assertStatus(401);
});

test('sessão de operador não pode ser renovada via /auth/refresh', function () {
    $operator = User::factory()->systemOperator()->create();
    $token = $operator->createToken('t')->plainTextToken;

    $this->withToken($token)->postJson('/api/v1/auth/refresh')->assertForbidden();
});

test('regenerar códigos de recuperação exige um código da app', function () {
    [$user, $secret] = operatorWithTwoFactor();
    $token = $user->createToken('t')->plainTextToken;

    $this->withToken($token)->postJson('/api/v1/auth/system/2fa/recovery-codes', ['code' => '000000'])->assertStatus(422);
    $this->withToken($token)->postJson('/api/v1/auth/system/2fa/recovery-codes', ['code' => otp($secret)])
        ->assertOk()
        ->assertJsonCount(8, 'data.recoveryCodes');
});

test('token de staff expira em 30 dias', function () {
    User::factory()->restaurantStaff()->create(['email' => 'staff@luku.ao']);

    $this->postJson('/api/v1/auth/login', ['email' => 'staff@luku.ao', 'password' => 'password'])->assertOk();

    $expiresAt = DB::table('personal_access_tokens')->value('expires_at');
    expect((int) round(now()->diffInDays($expiresAt)))->toBe(30);
});

test('reset de senha exige 12+ caracteres com letras e números', function (string $weak) {
    $user = User::factory()->restaurantStaff()->create();
    $token = Password::createToken($user);

    $this->postJson('/api/v1/auth/reset-password', [
        'email' => $user->email, 'token' => $token, 'password' => $weak, 'password_confirmation' => $weak,
    ])->assertStatus(422)->assertJsonValidationErrors('password');
})->with(['curta123', '123456789012345', 'soletrasmuitaslongas']);

test('formulário público: trocar de email a cada pedido não contorna o limite por IP', function () {
    foreach (range(1, 3) as $i) {
        $this->postJson('/api/v1/contact-messages', ['email' => "spam{$i}@x.com"])->assertStatus(422);
    }

    $this->postJson('/api/v1/contact-messages', ['email' => 'spam4@x.com'])->assertStatus(429);
});
