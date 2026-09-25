<?php

namespace App\Jobs;

use App\Services\FollowerBroadcaster;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;

/** Fim da janela de agrupamento de preços (ver FollowerBroadcaster) —
 * UMA notificação "atualizou N preços", nunca uma por prato. */
class NotifyFollowersOfPriceChangesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable;

    public function __construct(public readonly int $restaurantId) {}

    public function handle(FollowerBroadcaster $broadcaster): void
    {
        $count = $broadcaster->pullPriceChanges($this->restaurantId);
        if ($count < 1) {
            return;
        }

        $broadcaster->broadcast($this->restaurantId, 'followPriceChange', (string) $count);
    }
}
