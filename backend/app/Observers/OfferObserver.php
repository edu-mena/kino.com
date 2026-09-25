<?php

namespace App\Observers;

use App\Models\Offer;
use App\Services\FollowerBroadcaster;

/** Promoção nova avisa os seguidores — mesmas regras do story (ver
 * RestaurantStoryObserver). O título vai no snapshot para o texto da
 * notificação. Promoções globais da equipa Luku não têm seguidores. */
class OfferObserver
{
    public function __construct(private readonly FollowerBroadcaster $broadcaster) {}

    public function created(Offer $offer): void
    {
        $this->maybeBroadcast($offer);
    }

    public function updated(Offer $offer): void
    {
        if ($offer->wasChanged('processing_status')) {
            $this->maybeBroadcast($offer);
        }
    }

    private function maybeBroadcast(Offer $offer): void
    {
        if (! $offer->restaurant_id || ($offer->processing_status ?? 'ready') !== 'ready') {
            return;
        }
        if ($this->broadcaster->claim($offer)) {
            $this->broadcaster->broadcast(
                $offer->restaurant_id,
                'followOfferNew',
                mb_substr((string) $offer->title, 0, 120),
            );
        }
    }
}
