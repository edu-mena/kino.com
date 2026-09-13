<?php

namespace App\Http\Middleware;

use App\Models\BlockedIp;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

/**
 * Barra qualquer IP em `blocked_ips` ANTES de tocar no controller — aplicado
 * só às rotas do login de sistema (ver routes/api_v1.php, grupo
 * "system-access"). Resposta idêntica à de credenciais inválidas (401,
 * mesma mensagem) para nunca confirmar ao próprio atacante que está
 * bloqueado especificamente — isso só o ensinaria a tentar doutro IP.
 *
 * Cache::remember com TTL curto (60s) — evita 1 query a `blocked_ips` por
 * request nesta rota sensível sem arriscar servir uma resposta "não
 * bloqueado" por muito tempo depois de um bloqueio acabado de acontecer.
 */
class EnsureIpNotBlocked
{
    public function handle(Request $request, Closure $next): Response
    {
        $ip = $request->ip();
        $isBlocked = Cache::remember(
            "blocked-ip:{$ip}",
            60,
            fn () => BlockedIp::query()->where('ip', $ip)->exists(),
        );

        if ($isBlocked) {
            return response()->json(['message' => 'Credenciais inválidas.'], 401);
        }

        return $next($request);
    }
}
