<?php

namespace App\Observers;

use App\Models\RestaurantStory;
use App\Services\FollowerBroadcaster;

/** Story novo avisa os seguidores — só quando já está visível
 * (`processing_status = ready`: um vídeo avisa no fim do processamento,
 * não no upload). Stories globais da equipa Luku não têm seguidores. */
class RestaurantStoryObserver
{
    public function __construct(private readonly FollowerBroadcaster $broadcaster) {}

    public function created(RestaurantStory $story): void
    {
        $this->maybeBroadcast($story);
    }

    public function updated(RestaurantStory $story): void
    {
        if ($story->wasChanged('processing_status')) {
            $this->maybeBroadcast($story);
        }
    }

    private function maybeBroadcast(RestaurantStory $story): void
    {
        if (! $story->restaurant_id || $story->processing_status !== 'ready') {
            return;
        }
        if ($this->broadcaster->claim($story)) {
            $this->broadcaster->broadcast($story->restaurant_id, 'followStoryNew');
        }
    }
}
