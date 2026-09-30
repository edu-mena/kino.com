<?php

namespace App\Services;

use App\Mail\SystemSecurityAlertMail;
use App\Models\BlockedIp;
use App\Models\SystemSecurityEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;

/**
 * Auditoria + alerta por email + bloqueio automático de IP de TUDO o que
 * acontece no login de sistema — antes vivia só dentro de
 * AuthController::systemLogin; com o 2FA (Fase 1 da auditoria) o mesmo
 * tratamento aplica-se ao segundo passo (TwoFactorController).
 *
 * Nunca throttled: cada evento aqui é raro e relevante o suficiente para
 * avisar (ao contrário do `page_view` de SystemAccessController::notify).
 */
class SystemSecurityMonitor
{
    public const AUTO_BLOCK_AFTER_FAILURES = 5;

    /** @return bool true se este evento fez o IP ser bloqueado agora */
    public function record(Request $request, string $event, ?string $outcome, ?string $email = null): bool
    {
        $ip = (string) $request->ip();

        $record = SystemSecurityEvent::query()->create([
            'ip' => $ip,
            'user_agent' => (string) $request->userAgent(),
            'event' => $event,
            'outcome' => $outcome,
            'email_attempted' => $email,
        ]);

        $recentFails = SystemSecurityEvent::recentFailedLoginAttempts($ip);
        $autoBlocked = false;

        if ($outcome === 'failed' && $recentFails >= self::AUTO_BLOCK_AFTER_FAILURES) {
            BlockedIp::query()->firstOrCreate(
                ['ip' => $ip],
                ['reason' => 'auto:too_many_failed_attempts', 'blocked_at' => now()],
            );
            Cache::forget("blocked-ip:{$ip}");
            $autoBlocked = true;
        }

        Mail::to(config('mail.security_alert_address'))
            ->queue(new SystemSecurityAlertMail($record, $recentFails, $autoBlocked));

        return $autoBlocked;
    }
}
