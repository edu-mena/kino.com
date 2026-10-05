<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Aviso à própria pessoa quando a verificação em dois passos da sua conta de
 * restaurante é ligada ou desligada (StaffTwoFactorController) — se não foi
 * ela, alguém tem acesso à conta e ela fica a saber.
 */
class TwoFactorChangedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public readonly User $user, public readonly bool $enabled) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->enabled
            ? 'Luku · Verificação em dois passos ligada'
            : 'Luku · Verificação em dois passos DESLIGADA');
    }

    public function content(): Content
    {
        return new Content(markdown: 'emails.two-factor-changed');
    }
}
