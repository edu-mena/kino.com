<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use PragmaRX\Google2FA\Google2FA;

/**
 * 2FA por TOTP (Google Authenticator, Authy, 1Password...) — obrigatório
 * para operadores de sistema (auditoria de segurança, Fase 1).
 *
 * O login passa a ter dois passos: a senha certa já não devolve token, só
 * um *challenge* opaco de uso único guardado em cache (10 min, no máximo
 * MAX_CHALLENGE_ATTEMPTS códigos errados). O token Sanctum só nasce depois
 * do código TOTP (ou de um código de recuperação) — ver
 * TwoFactorController.
 */
class TwoFactorService
{
    public const CHALLENGE_TTL_MINUTES = 10;

    public const MAX_CHALLENGE_ATTEMPTS = 5;

    private const RECOVERY_CODES = 8;

    public function __construct(private readonly Google2FA $google2fa) {}

    /**
     * @param  'required'|'setup'  $mode  `setup` = conta ainda sem 2FA, tem
     *                                    de o ativar antes de receber token.
     */
    public function createChallenge(User $user, string $mode): string
    {
        $challenge = Str::random(64);

        Cache::put($this->challengeKey($challenge), [
            'user_id' => $user->id,
            'mode' => $mode,
            'attempts' => 0,
            'pending_secret' => null,
        ], now()->addMinutes(self::CHALLENGE_TTL_MINUTES));

        return $challenge;
    }

    /** @return array{user_id: int, mode: string, attempts: int, pending_secret: ?string}|null */
    public function challenge(string $challenge): ?array
    {
        return Cache::get($this->challengeKey($challenge));
    }

    public function updateChallenge(string $challenge, array $state): void
    {
        Cache::put($this->challengeKey($challenge), $state, now()->addMinutes(self::CHALLENGE_TTL_MINUTES));
    }

    /** Conta um código errado; a partir do limite o challenge morre e é
     * preciso voltar a pôr a senha. Devolve true se ainda pode tentar. */
    public function registerFailedAttempt(string $challenge, array $state): bool
    {
        $state['attempts']++;

        if ($state['attempts'] >= self::MAX_CHALLENGE_ATTEMPTS) {
            $this->forgetChallenge($challenge);

            return false;
        }

        $this->updateChallenge($challenge, $state);

        return true;
    }

    public function forgetChallenge(string $challenge): void
    {
        Cache::forget($this->challengeKey($challenge));
    }

    public function generateSecret(): string
    {
        return $this->google2fa->generateSecretKey(32);
    }

    public function otpauthUrl(User $user, string $secret): string
    {
        return $this->google2fa->getQRCodeUrl('Luku', $user->email, $secret);
    }

    /**
     * Valida o código contra `$secret` (por omissão o já ativado) e rejeita
     * um passo de 30s igual ou anterior ao último aceite — o mesmo código
     * nunca serve duas vezes, mesmo dentro da sua janela de validade.
     */
    public function verifyCode(User $user, string $code, ?string $secret = null): bool
    {
        $secret ??= $user->two_factor_secret;
        $code = preg_replace('/\s+/', '', $code);

        if (! $secret || ! preg_match('/^\d{6}$/', $code)) {
            return false;
        }

        // `?? 0` (nunca null): com null a biblioteca devolve só `true`, sem o
        // passo exato que bateu — e é esse passo que tem de ficar gravado.
        $step = $this->google2fa->verifyKeyNewer($secret, $code, $user->two_factor_last_step ?? 0);

        if ($step === false) {
            return false;
        }

        $user->forceFill(['two_factor_last_step' => $step])->save();

        return true;
    }

    /** Consome (apaga) o código se bater com algum — uso único. */
    public function useRecoveryCode(User $user, string $code): bool
    {
        $code = strtolower(trim($code));
        $hashes = $user->two_factor_recovery_codes ?? [];

        foreach ($hashes as $i => $hash) {
            if (Hash::check($code, $hash)) {
                unset($hashes[$i]);
                $user->forceFill(['two_factor_recovery_codes' => array_values($hashes)])->save();

                return true;
            }
        }

        return false;
    }

    /**
     * Gera e grava novos códigos de recuperação (substituem os anteriores);
     * devolve-os em claro — única vez que existem assim.
     *
     * @return list<string>
     */
    public function regenerateRecoveryCodes(User $user): array
    {
        $codes = collect(range(1, self::RECOVERY_CODES))
            ->map(fn () => strtolower(Str::random(5).'-'.Str::random(5)))
            ->all();

        $user->forceFill([
            'two_factor_recovery_codes' => array_map(fn ($c) => Hash::make($c), $codes),
        ])->save();

        return $codes;
    }

    private function challengeKey(string $challenge): string
    {
        return 'two-factor-challenge:'.hash('sha256', $challenge);
    }
}
