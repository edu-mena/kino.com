<?php

namespace App\Services;

use App\Support\JwksTokenVerifier;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Troca direta HTTP com os endpoints do Google (sem SDK pesado — ver plano).
 * Cobre os dois shapes aceites por POST /auth/google/callback:
 *  - Web: authorization-code flow -> troca `code` por tokens, depois valida o id_token devolvido.
 *  - Mobile nativo (Google Sign-In SDK): já chega com `id_token`, só valida.
 */
class GoogleOAuthService
{
    private const JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';

    private const JWKS_CACHE_KEY = 'google-oauth-jwks';

    private const ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];

    public function __construct(private readonly JwksTokenVerifier $jwks) {}

    /**
     * @return array{sub: string, email: string, name: string, picture: ?string}
     */
    public function resolveFromAuthorizationCode(string $code): array
    {
        $tokenResponse = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'code' => $code,
            // O authorization-code flow só existe no fluxo Web — usa sempre
            // o client_id Web, nunca o Android/iOS (esses usam Google
            // Sign-In nativo e chegam já com id_token, ver verifyIdToken()).
            'client_id' => config('services.google.web_client_id'),
            'client_secret' => config('services.google.client_secret'),
            // 'postmessage' (string literal, não uma URL) é o valor exigido
            // pelo Google para o popup flow do GIS (`ux_mode: 'popup'`) — o
            // `code` é emitido internamente contra esse pseudo-redirect, não
            // contra a origem da página, mesmo que o cliente passe
            // `redirect_uri` no `initCodeClient` (ignorado nesse modo).
            // Fixado aqui no servidor (não confia num valor vindo do
            // cliente) porque só este fluxo existe hoje — bug encontrado em
            // revisão cruzada antes de testar em browser real.
            'redirect_uri' => 'postmessage',
            'grant_type' => 'authorization_code',
        ]);

        if ($tokenResponse->failed()) {
            throw new RuntimeException('google_token_exchange_failed');
        }

        $idToken = $tokenResponse->json('id_token');

        return $this->verifyIdToken($idToken);
    }

    /**
     * @return array{sub: string, email: string, name: string, picture: ?string}
     */
    public function verifyIdToken(string $idToken): array
    {
        // Validação LOCAL da assinatura contra as chaves públicas do Google
        // (auditoria de segurança, Fase 6) — antes ia ao `tokeninfo`, o
        // endpoint de debug do Google, sem garantia de disponibilidade nem
        // de rate limit em produção. `JWT::decode` valida assinatura (RS256),
        // `exp`, `nbf` e `iat`; o resto (emissor, audiência, email) é aqui.
        $payload = $this->jwks->decode($idToken, self::JWKS_URL, self::JWKS_CACHE_KEY);

        if (! in_array($payload['iss'] ?? null, self::ISSUERS, true)) {
            throw new RuntimeException('google_id_token_issuer_mismatch');
        }

        // O id_token do Google Sign-In nativo (Android/iOS) tem `aud` = o
        // client_id ANDROID/IOS registado na Google Cloud Console — não o
        // client_id Web usado no authorization-code flow. Sem aceitar os
        // três, todo login mobile falhava aqui com "audiência não bate"
        // mesmo sendo um id_token genuíno (bug encontrado em revisão
        // cruzada). `sub` identifica a mesma conta Google independentemente
        // de qual client_id gerou o token, então isto não afeta o dedupe de
        // user feito em AuthController::googleCallback.
        $allowedAudiences = array_values(array_filter([
            config('services.google.web_client_id'),
            config('services.google.android_client_id'),
            config('services.google.ios_client_id'),
        ]));

        if (! in_array($payload['aud'] ?? null, $allowedAudiences, true)) {
            throw new RuntimeException('google_id_token_audience_mismatch');
        }

        // O `googleCallback` liga contas pelo email quando o `sub` ainda não
        // é conhecido — sem esta verificação, uma conta Google com um email
        // alheio ainda por confirmar entraria na conta Luku do verdadeiro
        // dono desse email.
        if (($payload['email_verified'] ?? null) !== true) {
            throw new RuntimeException('google_email_not_verified');
        }

        return [
            'sub' => $payload['sub'],
            'email' => $payload['email'],
            'name' => $payload['name'] ?? $payload['email'],
            'picture' => $payload['picture'] ?? null,
        ];
    }
}
