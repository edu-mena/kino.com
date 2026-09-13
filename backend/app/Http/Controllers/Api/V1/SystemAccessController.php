<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\BlockedIpResource;
use App\Mail\SystemSecurityAlertMail;
use App\Models\BlockedIp;
use App\Models\SystemSecurityEvent;
use Illuminate\Contracts\View\View;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;

/**
 * Segurança do login de sistema (/sistema/entrar) — pedido explícito do
 * utilizador: notificação por email em CADA acesso + capacidade de fechar
 * um IP. Ver EnsureIpNotBlocked (bloqueio em si) e
 * AuthController::systemLogin (tentativas de login).
 */
class SystemAccessController extends Controller
{
    /** Chamado pelo frontend ao montar /sistema/entrar — só regista a
     * VISITA à página (ninguém tentou entrar ainda). Público de propósito
     * (a própria página é pública, só o painel a seguir é que não). */
    public function notify(Request $request): JsonResponse
    {
        $ip = (string) $request->ip();

        $event = SystemSecurityEvent::query()->create([
            'ip' => $ip,
            'user_agent' => (string) $request->userAgent(),
            'event' => 'page_view',
        ]);

        // Sem isto, cada reload/aba nova disparava um email — uma visita
        // "normal" gera no máximo 1 email por IP a cada 15 min; tentativas
        // de LOGIN (systemLogin) nunca são limitadas, essas são sempre
        // raras e sempre importantes o suficiente para avisar sempre.
        $throttleKey = "system-access-notify-email:{$ip}";
        if (! Cache::has($throttleKey)) {
            Cache::put($throttleKey, true, now()->addMinutes(15));
            Mail::to(config('mail.security_alert_address'))
                ->queue(new SystemSecurityAlertMail($event, SystemSecurityEvent::recentFailedLoginAttempts($ip)));
        }

        // 204 sempre — mesmo se o IP estiver bloqueado (EnsureIpNotBlocked
        // corre antes desta rota e já intercepta esse caso com a mesma
        // resposta genérica de sempre, nunca chega aqui).
        return response()->json(null, 204);
    }

    /** Link assinado do email de alerta — um clique fecha o IP, sem sessão
     * nenhuma (`signed` middleware valida a assinatura, ver routes). */
    public function blockIp(string $ip): View
    {
        BlockedIp::query()->firstOrCreate(
            ['ip' => $ip],
            ['reason' => 'manual:email_link', 'blocked_at' => now()],
        );
        Cache::forget("blocked-ip:{$ip}");

        return view('system-access.blocked', ['ip' => $ip]);
    }

    /** Lista de IPs bloqueados — só para operadores já autenticados, mesmo
     * padrão de `abort_unless` usado em SubscriptionController. */
    public function index(Request $request): AnonymousResourceCollection
    {
        abort_unless($request->user()->isSystemOperator(), 403);

        return BlockedIpResource::collection(
            BlockedIp::query()->latest('blocked_at')->get(),
        );
    }

    public function destroy(Request $request, BlockedIp $blockedIp): JsonResponse
    {
        abort_unless($request->user()->isSystemOperator(), 403);

        Cache::forget("blocked-ip:{$blockedIp->ip}");
        $blockedIp->delete();

        return response()->json(null, 204);
    }
}
