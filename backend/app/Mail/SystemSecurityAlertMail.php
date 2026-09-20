<?php

namespace App\Mail;

use App\Models\SystemSecurityEvent;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\URL;

/**
 * Alerta de segurança para QUALQUER acesso ao login de sistema
 * (/sistema/entrar) — visita à página ou tentativa de login, sucesso ou
 * falha (ver SystemAccessController::notify / AuthController::systemLogin).
 * Enviado em fila (nunca bloqueia o request que a disparou) para
 * `config('mail.security_alert_address')`.
 *
 * Traz sempre um link assinado (nunca expira — ver `blockIpUrl`) para
 * bloquear o IP com um clique, sem precisar de sessão nenhuma: é a resposta
 * direta ao pedido de poder "fechar" o acesso àquele endereço.
 */
class SystemSecurityAlertMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public readonly string $blockIpUrl;

    public function __construct(
        public readonly SystemSecurityEvent $event,
        public readonly int $recentFailedAttempts,
        public readonly bool $autoBlocked = false,
    ) {
        $this->blockIpUrl = URL::signedRoute('system-access.block-ip', ['ip' => $event->ip]);
    }

    public function envelope(): Envelope
    {
        $subject = match (true) {
            $this->autoBlocked => "🚫 IP bloqueado automaticamente — {$this->event->ip}",
            $this->event->event === 'login_attempt' && $this->event->outcome === 'success' => "✅ Login de sistema bem-sucedido — {$this->event->ip}",
            $this->event->event === 'login_attempt' => "⚠️ Tentativa de login de sistema falhada — {$this->event->ip}",
            default => "👀 Acesso à página de login de sistema — {$this->event->ip}",
        };

        return new Envelope(subject: "Luku · {$subject}");
    }

    public function content(): Content
    {
        return new Content(markdown: 'emails.system-security-alert');
    }
}
