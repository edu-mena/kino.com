<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\IssuesAuthTokens;
use App\Http\Controllers\Controller;
use App\Mail\TwoFactorChangedMail;
use App\Models\User;
use App\Services\TwoFactorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;

/**
 * 2FA (TOTP) OPCIONAL para a equipa dos restaurantes — cada pessoa liga-o no
 * próprio painel (/admin/perfil). Com ele ligado, AuthController::login deixa
 * de devolver token e devolve um challenge; o token só sai em `verify`.
 *
 * À parte do TwoFactorController do operador de propósito: esse audita cada
 * passo em `system_security_events` e manda alerta para a equipa Luku, o que
 * não faz sentido para o login de um restaurante. Mesmo motor (TwoFactorService:
 * segredo cifrado, anti-replay, códigos de recuperação de uso único).
 */
class StaffTwoFactorController extends Controller
{
    use IssuesAuthTokens;

    private const SETUP_TTL_MINUTES = 15;

    public function __construct(private readonly TwoFactorService $twoFactor) {}

    /** 2º passo do login (sem sessão) — código da app ou de recuperação. */
    public function verify(Request $request): JsonResponse
    {
        $data = $request->validate([
            'challenge' => ['required', 'string', 'size:64'],
            'code' => ['required_without:recovery_code', 'nullable', 'string', 'max:10'],
            'recovery_code' => ['required_without:code', 'nullable', 'string', 'max:20'],
        ]);

        $state = $this->twoFactor->challenge($data['challenge']);
        $user = $state ? User::query()->where('role', 'restaurant_staff')->find($state['user_id']) : null;
        abort_unless($user && $state['mode'] === 'required', 401, 'A verificação expirou. Entre de novo.');

        $usedRecovery = false;
        $valid = ! empty($data['code'])
            ? $this->twoFactor->verifyCode($user, $data['code'])
            : ($usedRecovery = $this->twoFactor->useRecoveryCode($user, $data['recovery_code']));

        if (! $valid) {
            if (! $this->twoFactor->registerFailedAttempt($data['challenge'], $state)) {
                return response()->json(['message' => 'Demasiados códigos errados. Entre de novo.'], 401);
            }

            return response()->json([
                'message' => 'Código inválido.',
                'attemptsLeft' => TwoFactorService::MAX_CHALLENGE_ATTEMPTS - $state['attempts'] - 1,
            ], 422);
        }

        $this->twoFactor->forgetChallenge($data['challenge']);
        $user->update(['last_login_at' => now()]);

        $response = $this->issueTokenResponse($request, $user);
        if ($usedRecovery) {
            $payload = $response->getData(true);
            $payload['data']['recoveryCodesLeft'] = count($user->two_factor_recovery_codes ?? []);

            return response()->json($payload);
        }

        return $response;
    }

    /** Ativação, passo 1 (com sessão): segredo + QR. Fica pendente em cache
     * até um primeiro código certo em `confirm` — nada é gravado antes. */
    public function setup(Request $request): JsonResponse
    {
        $user = $this->staff($request);
        abort_if($user->hasTwoFactorEnabled(), 422, 'A verificação em dois passos já está ligada.');

        $secret = Cache::remember($this->setupKey($user), now()->addMinutes(self::SETUP_TTL_MINUTES),
            fn () => $this->twoFactor->generateSecret());

        return response()->json(['data' => [
            'secret' => $secret,
            'otpauthUrl' => $this->twoFactor->otpauthUrl($user, $secret),
        ]]);
    }

    /** Ativação, passo 2: 1º código certo grava o segredo e devolve os
     * códigos de recuperação (única vez em claro). As OUTRAS sessões da
     * conta terminam — quem tivesse um token roubado deixa de o ter. */
    public function confirm(Request $request): JsonResponse
    {
        $user = $this->staff($request);
        abort_if($user->hasTwoFactorEnabled(), 422, 'A verificação em dois passos já está ligada.');
        $data = $request->validate(['code' => ['required', 'string', 'max:10']]);

        $secret = Cache::get($this->setupKey($user));
        abort_unless($secret, 422, 'O código QR expirou. Comece de novo.');

        if (! $this->twoFactor->verifyCode($user, $data['code'], $secret)) {
            return response()->json(['message' => 'Código inválido.'], 422);
        }

        $user->forceFill(['two_factor_secret' => $secret, 'two_factor_confirmed_at' => now()])->save();
        $codes = $this->twoFactor->regenerateRecoveryCodes($user);
        Cache::forget($this->setupKey($user));
        $user->tokens()->where('id', '!=', $user->currentAccessToken()->id)->delete();

        Mail::to($user->email)->queue(new TwoFactorChangedMail($user, enabled: true));

        return response()->json(['data' => ['recoveryCodes' => $codes, 'twoFactorEnabled' => true]]);
    }

    /** Desligar exige um código (da app ou de recuperação) — o token de
     * sessão sozinho não chega, senão roubar a sessão bastava para o tirar. */
    public function disable(Request $request): JsonResponse
    {
        $user = $this->staff($request);
        abort_unless($user->hasTwoFactorEnabled(), 422, 'A verificação em dois passos não está ligada.');
        $data = $request->validate([
            'code' => ['required_without:recovery_code', 'nullable', 'string', 'max:10'],
            'recovery_code' => ['required_without:code', 'nullable', 'string', 'max:20'],
        ]);

        $valid = ! empty($data['code'])
            ? $this->twoFactor->verifyCode($user, $data['code'])
            : $this->twoFactor->useRecoveryCode($user, $data['recovery_code']);
        if (! $valid) {
            return response()->json(['message' => 'Código inválido.'], 422);
        }

        $user->forceFill([
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
            'two_factor_last_step' => null,
        ])->save();

        Mail::to($user->email)->queue(new TwoFactorChangedMail($user, enabled: false));

        return response()->json(['data' => ['twoFactorEnabled' => false]]);
    }

    public function regenerateRecoveryCodes(Request $request): JsonResponse
    {
        $user = $this->staff($request);
        abort_unless($user->hasTwoFactorEnabled(), 422, 'A verificação em dois passos não está ligada.');
        $data = $request->validate(['code' => ['required', 'string', 'max:10']]);

        if (! $this->twoFactor->verifyCode($user, $data['code'])) {
            return response()->json(['message' => 'Código inválido.'], 422);
        }

        return response()->json(['data' => ['recoveryCodes' => $this->twoFactor->regenerateRecoveryCodes($user)]]);
    }

    /** Só a conta da própria pessoa da equipa — nunca o token "emprestado"
     * de um operador a ver o painel (esse tem o seu 2FA próprio). */
    private function staff(Request $request): User
    {
        $user = $request->user();
        abort_unless($user->role === 'restaurant_staff', 403);

        return $user;
    }

    private function setupKey(User $user): string
    {
        return "staff-2fa-setup:{$user->id}";
    }
}
