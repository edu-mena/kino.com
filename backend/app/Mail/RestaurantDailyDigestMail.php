<?php

namespace App\Mail;

use App\Models\Restaurant;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/** Resumo diário (Fase N6) — ver SendRestaurantDailyDigestsJob, só
 * despachado para restaurantes com atividade no dia anterior. */
class RestaurantDailyDigestMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    /**
     * @param  array{ordersCount: int, ordersRevenue: float, reservationsCount: int, reservationsConfirmed: int, reviewsCount: int, reviewsAvgRating: float|null}  $summary
     */
    public function __construct(
        public readonly Restaurant $restaurant,
        public readonly array $summary,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: "Luku · O resumo de ontem no {$this->restaurant->name}");
    }

    public function content(): Content
    {
        return new Content(markdown: 'emails.restaurant-daily-digest');
    }
}
