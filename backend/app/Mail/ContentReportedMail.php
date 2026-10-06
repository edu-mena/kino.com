<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/** Para a equipa Luku: 1ª denúncia de um conteúdo (ModerationService). Só
 * tipo/motivo/link — o conteúdo em si vê-se em /sistema/denuncias. */
class ContentReportedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $type,
        public readonly string $contentId,
        public readonly string $reason,
        public readonly ?string $details,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Luku · Conteúdo denunciado — responder em 24h');
    }

    public function content(): Content
    {
        return new Content(markdown: 'emails.content-reported', with: [
            'typeLabel' => ['review' => 'Avaliação', 'story' => 'Story', 'offer' => 'Promoção'][$this->type] ?? $this->type,
            'reasonLabel' => [
                'offensive' => 'Ofensivo ou abusivo', 'spam' => 'Spam ou publicidade',
                'false_info' => 'Informação falsa', 'other' => 'Outro',
            ][$this->reason] ?? $this->reason,
            'url' => rtrim((string) config('app.frontend_url'), '/').'/sistema/denuncias',
        ]);
    }
}
