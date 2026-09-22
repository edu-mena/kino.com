<?php

namespace App\Mail;

use App\Models\SupportTicket;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Para a equipa Luku (config('mail.contact_address'), mesmo endereço do
 * formulário de /contacto) — enviado ao criar um ticket de suporte a partir
 * do painel do restaurante (SupportTicketController::store). Antes disto o
 * frontend só abria o cliente de email do PRÓPRIO restaurante (mailto:),
 * com o endereço errado — nada garantia que a mensagem chegasse à Luku.
 */
class SupportTicketMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public readonly SupportTicket $ticket) {}

    public function envelope(): Envelope
    {
        $replyTo = $this->ticket->restaurant?->email;

        return new Envelope(
            subject: "Luku · Suporte — {$this->ticket->restaurant?->name}: {$this->ticket->subject}",
            replyTo: $replyTo ? [$replyTo] : [],
        );
    }

    public function content(): Content
    {
        return new Content(markdown: 'emails.support-ticket');
    }
}
