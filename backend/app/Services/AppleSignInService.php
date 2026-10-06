<?php

namespace App\Services;

use App\Support\JwksTokenVerifier;
use Firebase\JWT\JWT;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * "Iniciar sessão com Apple" — obrigatório na App Store para apps cujo
 * login de cliente é feito com um serviço de terceiros (Google), guideline
 * 4.8. Mesmo modelo do GoogleOAuthService: o id_token chega do SDK nativo
 * (iOS, AuthenticationServices) e é validado AQUI contra as chaves públicas
 * da Apple — nunca se confia em nada decodificado do lado do cliente.
 *
 * Revogação (guideline 5.1.1(v)): ao apagar a conta, a Apple exige revogar
 * o acesso dado por "Iniciar sessão com Apple". Isso pede um `client_secret`
 * assinado com a chave .p8 da conta Apple Developer (APPLE_TEAM_ID,
 * APPLE_KEY_ID, APPLE_PRIVATE_KEY) — sem essas variáveis, o login funciona
 * na mesma e a troca/revogação ficam desligadas (ver isRevocationConfigured).
 */
class AppleSignInService
{
    private const JWKS_URL = 'https://appleid.apple.com/auth/keys';

    private const JWKS_CACHE_KEY = 'apple-signin-jwks';

    private const ISSUER = 'https://appleid.apple.com';

    public function __construct(private readonly JwksTokenVerifier $jwks) {}

    /**
     * @return array{sub: string, email: ?string, email_verified: bool, aud: string}
     */
    public function verifyIdToken(string $idToken, ?string $nonce = null): array
    {
        $payload = $this->jwks->decode($idToken, self::JWKS_URL, self::JWKS_CACHE_KEY);

        if (($payload['iss'] ?? null) !== self::ISSUER) {
            throw new RuntimeException('apple_id_token_issuer_mismatch');
        }

        // Bundle ID da app iOS (login nativo) e, se um dia houver login Apple
        // na web/Android, o Services ID — qualquer um dos configurados.
        if (! in_array($payload['aud'] ?? null, $this->clientIds(), true)) {
            throw new RuntimeException('apple_id_token_audience_mismatch');
        }

        // Nonce gerado pela app para este login: o token tem de o trazer (em
        // claro ou em SHA-256, conforme o SDK) — um id_token intercetado
        // noutro login não serve aqui.
        if ($nonce !== null) {
            $claim = (string) ($payload['nonce'] ?? '');
            if (! hash_equals($claim, $nonce) && ! hash_equals($claim, hash('sha256', $nonce))) {
                throw new RuntimeException('apple_id_token_nonce_mismatch');
            }
        }

        return [
            'sub' => (string) $payload['sub'],
            'email' => isset($payload['email']) ? strtolower((string) $payload['email']) : null,
            // A Apple manda "true" (string) ou true conforme a versão.
            'email_verified' => in_array($payload['email_verified'] ?? null, [true, 'true'], true),
            'aud' => (string) $payload['aud'],
        ];
    }

    public function isRevocationConfigured(): bool
    {
        return filled(config('services.apple.team_id'))
            && filled(config('services.apple.key_id'))
            && filled(config('services.apple.private_key'));
    }

    /** Troca o authorization code (uso único, 5 min) por um refresh token —
     * a única coisa que a Apple aceita para revogar mais tarde. */
    public function exchangeAuthorizationCode(string $code, string $clientId): ?string
    {
        if (! $this->isRevocationConfigured()) {
            return null;
        }

        $response = Http::asForm()->timeout(10)->post(self::ISSUER.'/auth/token', [
            'client_id' => $clientId,
            'client_secret' => $this->clientSecret($clientId),
            'code' => $code,
            'grant_type' => 'authorization_code',
        ]);

        return $response->successful() ? $response->json('refresh_token') : null;
    }

    public function revoke(string $refreshToken, string $clientId): bool
    {
        if (! $this->isRevocationConfigured()) {
            return false;
        }

        return Http::asForm()->timeout(10)->post(self::ISSUER.'/auth/revoke', [
            'client_id' => $clientId,
            'client_secret' => $this->clientSecret($clientId),
            'token' => $refreshToken,
            'token_type_hint' => 'refresh_token',
        ])->successful();
    }

    /** @return list<string> */
    private function clientIds(): array
    {
        return array_values(array_filter(array_map('trim', explode(',', (string) config('services.apple.client_ids')))));
    }

    /** JWT ES256 assinado com a chave .p8 — o "client_secret" da Apple. */
    private function clientSecret(string $clientId): string
    {
        return JWT::encode([
            'iss' => config('services.apple.team_id'),
            'iat' => time(),
            'exp' => time() + 300,
            'aud' => self::ISSUER,
            'sub' => $clientId,
        ], str_replace('\n', "\n", (string) config('services.apple.private_key')), 'ES256', config('services.apple.key_id'));
    }
}
