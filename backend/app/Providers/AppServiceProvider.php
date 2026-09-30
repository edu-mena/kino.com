<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

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

        // Política de senha de staff/operador (auditoria de segurança, Fase
        // 1) — única via de definir senha é o reset (ver ResetPasswordRequest).
        // `uncompromised()` consulta a Have I Been Pwned por k-anonimato (só
        // os 5 primeiros caracteres do SHA-1 saem do servidor) — só em
        // produção, para os testes nunca dependerem de rede externa.
        Password::defaults(function () {
            $rule = Password::min(12)->letters()->numbers();

            return $this->app->isProduction() ? $rule->uncompromised() : $rule;
        });

        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(120)->by($request->ip());
        });

        // Login (Google callback + email/senha) — mitiga brute-force.
        RateLimiter::for('auth', function (Request $request) {
            $email = (string) $request->input('email', $request->ip());

            return [
                Limit::perMinute(5)->by($email.'|'.$request->ip()),
                // Por email, independente do IP: sem isto um ataque
                // distribuído (muitos IPs) contra UMA conta nunca batia no
                // limite acima, que é por par email|IP.
                Limit::perHour(20)->by('auth-email:'.strtolower($email)),
            ];
        });

        // Formulários públicos (contacto, candidatura de parceiro) — só por
        // IP: o `auth` acima é chaveado por email|IP, e aqui o email é
        // escolhido por quem envia, logo trocá-lo a cada pedido contornava
        // o limite por completo.
        RateLimiter::for('public-forms', function (Request $request) {
            return [
                Limit::perMinute(3)->by('forms:'.$request->ip()),
                Limit::perHour(20)->by('forms-h:'.$request->ip()),
            ];
        });

        // Login de sistema + notify de visita à página — bem mais apertado
        // que o `auth` genérico, e de propósito chaveado só por IP (nunca
        // por email|IP): o `auth` normal deixa um atacante rodar por
        // vários emails a partir do mesmo IP sem esbarrar no limite;
        // aqui o próprio IP já é o recurso a proteger (ver
        // EnsureIpNotBlocked/AuthController::systemLogin, que bloqueia o IP
        // de vez depois de falhas repetidas — isto aqui é só a primeira
        // linha de defesa, mais rápida que esperar 5 falhas).
        //
        // 10/min (era 5) desde o 2FA: um login honesto já faz 4 pedidos
        // (notify, senha, QR, código) e um código mal escrito punha o
        // operador legítimo em 429. Não enfraquece a defesa — a partir de 5
        // falhas (senha OU código) o IP é bloqueado de vez de qualquer forma.
        RateLimiter::for('system-auth', function (Request $request) {
            return [
                Limit::perMinute(10)->by($request->ip()),
                Limit::perHour(30)->by($request->ip()),
            ];
        });

        // Escrita de pedidos/reservas (checkout/reserva anónimos) — evita
        // spam de bots, 20/min por IP. 'sanctum' explícito: essas rotas
        // aceitam convidados sem token e não passam por auth:sanctum, então
        // $request->user() sem guard nunca veria um Bearer token presente
        // mesmo quando o cliente está autenticado.
        //
        // Este MESMO limiter (`throttle:writes`) acabou reaproveitado, fase
        // após fase, em quase toda escrita autenticada da API — perfil do
        // restaurante, horário, menus, pratos, gestão de pedidos/mesas,
        // etc. Um ator autenticado (staff/operador/cliente com conta) é bem
        // menos arriscado que um IP anónimo, mas ficava preso ao MESMO teto
        // de 20/min pensado só pra bots no checkout — um admin a gerir
        // pedidos ou a guardar o próprio perfil (que sozinho já dispara
        // 2-5 pedidos de escrita em sequência: horário + pagamento +
        // galeria + perfil) esgotava isso rápido e via "Too Many Attempts"
        // em uso normal (bug real, encontrado a testar o perfil). Autenticado
        // ganha um teto bem mais folgado; só o caminho anónimo (sem
        // `user('sanctum')`) mantém o limite original, apertado de propósito.
        RateLimiter::for('writes', function (Request $request) {
            $userId = $request->user('sanctum')?->id;
            if ($userId) {
                return Limit::perMinute(120)->by("user:{$userId}");
            }

            return Limit::perMinute(20)->by($request->ip());
        });

        // Mapas (moradas/rotas): as instâncias OSM públicas pedem uso
        // moderado — limite por utilizador ou IP (a cache faz o resto).
        RateLimiter::for('maps', function (Request $request) {
            $owner = $request->user('sanctum')?->id ?? $request->ip();

            return Limit::perMinute(60)->by('maps:'.$owner);
        });

        // Upload de imagem/vídeo — protege storage/fila de abuso.
        RateLimiter::for('uploads', function (Request $request) {
            $owner = $request->user()?->id ?? $request->ip();

            return Limit::perMinute(10)->by($owner);
        });
    }
}
