<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/**
 * Alerta TÉCNICO de incidente para o operador — com o erro exato de cada
 * verificação. Nunca em fila: é enviado justamente quando a fila (ou a base
 * de dados) pode estar em baixo, ver StatusMonitor::alertOperator.
 *
 * @phpstan-type CheckResult array{ok: bool, error: ?string, ms: int}
 */
class StatusAlertMail extends Mailable
{
    use Queueable;

    /**
     * @param  'started'|'resolved'  $phase
     * @param  list<string>  $components
     * @param  array<string, CheckResult>  $checks
     */
    public function __construct(
        public readonly string $phase,
        public readonly array $components,
        public readonly array $checks,
        public readonly string $startedAt,
        public readonly ?string $resolvedAt = null,
        /** Link assinado para AUTORIZAR o aviso aos utilizadores (abre uma
         * página de confirmação — nada é enviado só por abrir o link). */
        public readonly ?string $announceUrl = null,
    ) {}

    public function envelope(): Envelope
    {
        $subject = $this->phase === 'started'
            ? '🔴 Incidente: '.implode(', ', $this->components)
            : '✅ Incidente resolvido: '.implode(', ', $this->components);

        return new Envelope(subject: "Luku · {$subject}");
    }

    public function content(): Content
    {
        return new Content(markdown: 'emails.status-alert');
    }
}
