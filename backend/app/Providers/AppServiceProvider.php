<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    /**
     * Rate limiting Redis-backed por role/rota (ver plano, secção Redis).
     * Cada limiter é referenciado explicitamente nas rotas via
     * `throttle:<nome>`; o grupo `api` global (bootstrap/app.php) já cobre
     * leitura pública a 120/min por IP.
     */
    public function boot(): void
    {
        // A API não tem UI própria de "definir senha" — aponta o link do
        // email de reset para a página correspondente no frontend (staff/
        // operator), não para uma rota Laravel inexistente.
        ResetPassword::createUrlUsing(function ($user, string $token) {
            $frontendUrl = rtrim(config('app.frontend_url'), '/');

            return "{$frontendUrl}/definir-senha?token={$token}&email=".urlencode($user->email);
        });

        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(120)->by($request->ip());
        });

        // Login (Google callback + email/senha) — mitiga brute-force.
        RateLimiter::for('auth', function (Request $request) {
            $email = (string) $request->input('email', $request->ip());

            return Limit::perMinute(5)->by($email.'|'.$request->ip());
        });

        // Escrita de pedidos/reservas — evita spam de bots. 'sanctum'
        // explícito: algumas destas rotas (checkout/reserva) aceitam
        // convidados sem token e não passam por auth:sanctum, então
        // $request->user() sem guard nunca veria um Bearer token presente
        // mesmo quando o cliente está autenticado.
        RateLimiter::for('writes', function (Request $request) {
            $owner = $request->user('sanctum')?->id ?? $request->ip();

            return Limit::perMinute(20)->by($owner);
        });

        // Upload de imagem/vídeo — protege storage/fila de abuso.
        RateLimiter::for('uploads', function (Request $request) {
            $owner = $request->user()?->id ?? $request->ip();

            return Limit::perMinute(10)->by($owner);
        });
    }
}
