<?php

use App\Http\Middleware\EnsureIdempotency;
use App\Http\Middleware\EnsureIpNotBlocked;
use App\Http\Middleware\ForceJsonResponse;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        // Toda a API pública vive sob /api/v1 — ver plano, secção
        // "Versionamento": com apps móveis nativas em produção não dá para
        // forçar update imediato de clientes, por isso qualquer breaking
        // change futuro nasce como /api/v2 em paralelo, nunca quebrando v1.
        then: function () {
            Route::middleware('api')
                ->prefix('api/v1')
                ->group(__DIR__.'/../routes/api_v1.php');
        },
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    // Sem passar `channels:` a `withRouting()` acima de propósito — isso
    // regista `Broadcast::routes()` com o middleware por omissão ('web',
    // sessão/cookie) em `/broadcasting/auth`, que uma SPA com tokens Bearer
    // (Sanctum) nunca consegue autenticar. Aqui a rota nasce já sob
    // `api/v1` com `auth:sanctum` — o mesmo guard de toda a API — e
    // `routes/channels.php` continua a ser carregado (as regras de
    // `Broadcast::channel(...)` lá dentro) através do 2º argumento.
    ->withBroadcasting(
        __DIR__.'/../routes/channels.php',
        attributes: ['prefix' => 'api/v1', 'middleware' => ['api', 'auth:sanctum']],
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Fly.io termina o TLS na edge e reencaminha HTTP puro para o
        // container (ver fly.toml `internal_port = 8080`) — sem confiar nos
        // headers X-Forwarded-* dessa proxy, `$request->ip()` devolve o IP
        // interno do Fly (não o do cliente real) e `$request->isSecure()`
        // fica sempre falso. O primeiro quebra a segurança do login de
        // sistema (bloqueio de IP/alertas em AuthController::systemLogin
        // dependem do IP real); o segundo pode gerar URLs http:// em vez de
        // https:// (mixed content). '*' é seguro aqui porque só a proxy
        // interna do Fly consegue alcançar a porta 8080 do container.
        $middleware->trustProxies(at: '*');

        $middleware->api(prepend: [
            ForceJsonResponse::class,
        ]);

        $middleware->alias([
            'idempotent' => EnsureIdempotency::class,
            'ip.not-blocked' => EnsureIpNotBlocked::class,
        ]);

        $middleware->throttleApi();
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
