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
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
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
