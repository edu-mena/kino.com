<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\IssuesAuthTokens;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\SystemSecurityMonitor;
use App\Services\TwoFactorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Segundo passo do login de sistema (auditoria de segurança, Fase 1) — ver
 * AuthController::systemLogin, que só devolve um `challenge` depois da
 * senha certa. Sem sessão nenhuma até ao fim: o challenge (uso único, 10
 * min, no máximo 5 códigos errados) é a única prova de que a senha já foi
 * validada.
 *
 * - `setup` + `confirm`: conta ainda sem 2FA — gera o segredo, mostra o QR,
 *   e só grava depois de um primeiro código certo (prova que a app de
 *   autenticação ficou mesmo configurada). Devolve token + códigos de
 *   recuperação (única vez que aparecem em claro).
 * - `verify`: conta com 2FA — código da app OU código de recuperação.
 *
 * Cada código errado conta para o bloqueio automático de IP, tal como uma
 * senha errada (SystemSecurityEvent::recentFailedLoginAttempts).
 */
class TwoFactorController extends Controller
{
    use IssuesAuthTokens;

    public function __construct(
        private readonly TwoFactorService $twoFactor,
        private readonly SystemSecurityMonitor $monitor,
    ) {}

    public function setup(Request $request): JsonResponse
    {
        $data = $request->validate(['challenge' => ['required', 'string', 'size:64']]);
        [$state, $user] = $this->resolveChallenge($data['challenge'], 'setup');

        // Reaproveita o segredo pendente se o QR já foi pedido neste
        // challenge — recarregar a página não invalida o que já foi lido.
        $state['pending_secret'] ??= $this->twoFactor->generateSecret();
        $this->twoFactor->updateChallenge($data['challenge'], $state);

        return response()->json([
            'data' => [
                'secret' => $state['pending_secret'],
                'otpauthUrl' => $this->twoFactor->otpauthUrl($user, $state['pending_secret']),
            ],
        ]);
    }

    public function confirm(Request $request): JsonResponse
    {
        $data = $request->validate([
            'challenge' => ['required', 'string', 'size:64'],
            'code' => ['required', 'string', 'max:10'],
        ]);
        [$state, $user] = $this->resolveChallenge($data['challenge'], 'setup');
        abort_unless($state['pending_secret'], 422, 'Peça primeiro o código QR.');

        if (! $this->twoFactor->verifyCode($user, $data['code'], $state['pending_secret'])) {
            return $this->failedCode($request, $data['challenge'], $state, $user);
        }

        $user->forceFill([
            'two_factor_secret' => $state['pending_secret'],
            'two_factor_confirmed_at' => now(),
            'last_login_at' => now(),
        ])->save();
        $recoveryCodes = $this->twoFactor->regenerateRecoveryCodes($user);
        $this->twoFactor->forgetChallenge($data['challenge']);

        $this->monitor->record($request, 'two_factor_enabled', 'success', $user->email);

        $response = $this->issueTokenResponse($request, $user);
        $payload = $response->getData(true);
        $payload['data']['recoveryCodes'] = $recoveryCodes;

        return response()->json($payload);
    }

    public function verify(Request $request): JsonResponse
    {
        $data = $request->validate([
            'challenge' => ['required', 'string', 'size:64'],
            'code' => ['required_without:recovery_code', 'nullable', 'string', 'max:10'],
            'recovery_code' => ['required_without:code', 'nullable', 'string', 'max:20'],
        ]);
        [$state, $user] = $this->resolveChallenge($data['challenge'], 'required');

        $usedRecovery = false;
        if (! empty($data['code'])) {
            $valid = $this->twoFactor->verifyCode($user, $data['code']);
        } else {
            $valid = $usedRecovery = $this->twoFactor->useRecoveryCode($user, $data['recovery_code']);
        }

        if (! $valid) {
            return $this->failedCode($request, $data['challenge'], $state, $user);
        }

        $this->twoFactor->forgetChallenge($data['challenge']);
        $user->update(['last_login_at' => now()]);
        $this->monitor->record($request, 'two_factor', 'success', $user->email);

        $response = $this->issueTokenResponse($request, $user);
        if ($usedRecovery) {
            $payload = $response->getData(true);
            $payload['data']['recoveryCodesLeft'] = count($user->two_factor_recovery_codes ?? []);

            return response()->json($payload);
        }

        return $response;
    }

    /** Operador já autenticado gera códigos novos (os antigos deixam de
     * valer) — exige um código da app, não só o token de sessão. */
    public function regenerateRecoveryCodes(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->isSystemOperator() && $user->hasTwoFactorEnabled(), 403);

        $data = $request->validate(['code' => ['required', 'string', 'max:10']]);
        if (! $this->twoFactor->verifyCode($user, $data['code'])) {
            $this->monitor->record($request, 'two_factor', 'failed', $user->email);

            return response()->json(['message' => 'Código inválido.'], 422);
        }

        $codes = $this->twoFactor->regenerateRecoveryCodes($user);
        $this->monitor->record($request, 'recovery_codes_regenerated', 'success', $user->email);

        return response()->json(['data' => ['recoveryCodes' => $codes]]);
    }

    /** @return array{0: array, 1: User} */
    private function resolveChallenge(string $challenge, string $expectedMode): array
    {
        $state = $this->twoFactor->challenge($challenge);
        $user = $state ? User::query()->where('role', 'system_operator')->find($state['user_id']) : null;

        // Challenge inexistente/expirado/esgotado, ou de outro modo (ex:
        // tentar `setup` numa conta que já tem 2FA para trocar o segredo
        // sem saber o código atual) — tudo igual: volta ao início.
        abort_unless($user && $state['mode'] === $expectedMode, 401, 'A verificação expirou. Entre de novo.');

        return [$state, $user];
    }

    private function failedCode(Request $request, string $challenge, array $state, User $user): JsonResponse
    {
        $stillValid = $this->twoFactor->registerFailedAttempt($challenge, $state);
        $this->monitor->record($request, 'two_factor', 'failed', $user->email);

        if (! $stillValid) {
            return response()->json(['message' => 'Demasiados códigos errados. Entre de novo.'], 401);
        }

        return response()->json([
            'message' => 'Código inválido.',
            'attemptsLeft' => TwoFactorService::MAX_CHALLENGE_ATTEMPTS - $state['attempts'] - 1,
        ], 422);
    }
}
