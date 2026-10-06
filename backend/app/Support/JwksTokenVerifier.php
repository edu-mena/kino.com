<?php

namespace App\Support;

use Firebase\JWT\JWK;
use Firebase\JWT\JWT;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Throwable;

/**
 * Valida LOCALMENTE a assinatura de um id_token (JWT RS256) contra as chaves
 * públicas (JWKS) do emissor — Google (GoogleOAuthService) e Apple
 * (AppleSignInService). `JWT::decode` valida assinatura, `exp`, `nbf` e
 * `iat`; emissor, audiência e o resto ficam com quem chama.
 */
class JwksTokenVerifier
{
    /** @return array<string, mixed> */
    public function decode(string $jwt, string $jwksUrl, string $cacheKey): array
    {
        // Relógios de telemóvel desacertados uns segundos não devem chumbar
        // um token acabado de emitir (`iat` "no futuro").
        JWT::$leeway = 60;

        try {
            return (array) JWT::decode($jwt, JWK::parseKeySet($this->keys($jwksUrl, $cacheKey)));
        } catch (Throwable $e) {
            // Os emissores rodam as chaves periodicamente: um `kid`
            // desconhecido pode só querer dizer que a cache ficou velha —
            // uma nova tentativa com as chaves acabadas de buscar, nunca mais.
            if (! str_contains($e->getMessage(), '"kid"')) {
                throw new RuntimeException('id_token_invalid', previous: $e);
            }
        }

        try {
            return (array) JWT::decode($jwt, JWK::parseKeySet($this->keys($jwksUrl, $cacheKey, refresh: true)));
        } catch (Throwable $e) {
            throw new RuntimeException('id_token_invalid', previous: $e);
        }
    }

    /** JWKS em cache (as chaves duram dias; 6h é conservador). */
    private function keys(string $url, string $cacheKey, bool $refresh = false): array
    {
        if ($refresh) {
            Cache::forget($cacheKey);
        }

        return Cache::remember($cacheKey, now()->addHours(6), function () use ($url) {
            $response = Http::timeout(5)->get($url);

            if ($response->failed() || ! is_array($response->json('keys'))) {
                throw new RuntimeException('jwks_unavailable');
            }

            return $response->json();
        });
    }
}
