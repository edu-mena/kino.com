<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\MassPrunable;
use Illuminate\Database\Eloquent\Model;

class SystemSecurityEvent extends Model
{
    use HasFactory, MassPrunable;

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
            // Código 2FA errado conta como senha errada — sem isto, quem já
            // tivesse a senha podia tentar códigos sem nunca ser bloqueado.
            ->whereIn('event', ['login_attempt', 'two_factor'])
            ->where('outcome', 'failed')
            ->where('created_at', '>=', now()->subMinutes(30))
            ->count();
    }

    /*
     * Retenção de dados (auditoria de segurança, Fase 3 / Lei n.º 22/11 —
     * não guardar dados pessoais mais tempo do que o necessário). Corre no
     * `model:prune` diário (routes/console.php).
     */
    public function prunable(): Builder
    {
        // Auditoria de acessos ao login de sistema — 12 meses chegam para
        // investigar um incidente; IPs e user-agents são dados pessoais.
        return static::query()->where('created_at', '<', now()->subMonths(12));
    }
}
