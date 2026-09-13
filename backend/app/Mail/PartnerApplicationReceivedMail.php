<?php

namespace App\Mail;

use App\Models\PartnerApplication;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Para a EQUIPA Luku — enviado automaticamente ao submeter /parceiros
 * (PartnerApplicationController::store), em fila, sem depender do candidato
 * abrir aplicação de email nenhuma (ao contrário do `mailto:` que o
 * frontend usava antes). Ver PartnerApplicationConfirmationMail para a
 * confirmação que o próprio candidato recebe.
 */
class PartnerApplicationReceivedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public readonly PartnerApplication $application) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Luku · Novo pedido de parceria — {$this->application->restaurant_name}",
        );
    }

    public function content(): Content
    {
        return new Content(markdown: 'emails.partner-application-received');
    }
}
