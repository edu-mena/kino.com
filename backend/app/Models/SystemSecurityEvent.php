<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SystemSecurityEvent extends Model
{
    use HasFactory;

    protected $fillable = ['ip', 'user_agent', 'event', 'outcome', 'email_attempted'];

    /** Falhas de login deste IP nos últimos 30 min — fonte única usada tanto
     * pelo auto-bloqueio (AuthController::systemLogin) quanto pelo contexto
     * mostrado no email de alerta (SystemAccessController). DB, não cache —
     * é a contagem que decide um bloqueio, não pode depender de um TTL de
     * cache que pode ter sido limpo. */
    public static function recentFailedLoginAttempts(string $ip): int
    {
        return static::query()
            ->where('ip', $ip)
            ->where('event', 'login_attempt')
            ->where('outcome', 'failed')
            ->where('created_at', '>=', now()->subMinutes(30))
            ->count();
    }
}
