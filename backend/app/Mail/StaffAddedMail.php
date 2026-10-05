<?php

namespace App\Mail;

use App\Models\Restaurant;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Aviso a uma conta de staff JÁ EXISTENTE que outro restaurante a juntou à
 * equipa (RestaurantStaffController::store) — antes isto acontecia em
 * silêncio: o dono de qualquer restaurante podia pôr um email alheio na sua
 * equipa sem a pessoa saber (auditoria de segurança, Fase 6). Contas novas
 * não precisam disto: recebem o email de definir senha.
 */
class StaffAddedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly User $user,
        public readonly Restaurant $restaurant,
        public readonly string $roleInRestaurant,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: "Luku · Foi adicionado à equipa de {$this->restaurant->name}");
    }

    public function content(): Content
    {
        return new Content(markdown: 'emails.staff-added');
    }
}
