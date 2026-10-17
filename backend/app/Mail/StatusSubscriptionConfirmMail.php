<?php

namespace App\Mail;

use App\Models\StatusSubscriber;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/** Confirmação da inscrição nos avisos da página de estado (dupla
 * confirmação — ninguém inscreve o email de outra pessoa). */
class StatusSubscriptionConfirmMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public readonly StatusSubscriber $subscriber) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Luku · Confirme os avisos do estado dos serviços');
    }

    public function content(): Content
    {
        return new Content(markdown: 'emails.status-subscription-confirm');
    }
}
