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
 * Para o CANDIDATO — confirma que o pedido chegou, enviado para o email que
 * ele próprio submeteu no formulário (nunca revela nada interno, ao
 * contrário do email da equipa em PartnerApplicationReceivedMail).
 */
class PartnerApplicationConfirmationMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public readonly PartnerApplication $application) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Luku · Recebemos o seu pedido de parceria');
    }

    public function content(): Content
    {
        return new Content(markdown: 'emails.partner-application-confirmation');
    }
}
