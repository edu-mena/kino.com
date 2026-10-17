<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/** Aviso de incidente para os utilizadores (início ou resolução) — mesmo
 * texto do push e da página de estado, ver IncidentMessages. */
class StatusIncidentMail extends Mailable
{
    use Queueable;

    public function __construct(
        public readonly string $title,
        public readonly string $body,
        public readonly ?string $unsubscribeUrl = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: "Luku · {$this->title}");
    }

    public function content(): Content
    {
        return new Content(markdown: 'emails.status-incident');
    }
}
