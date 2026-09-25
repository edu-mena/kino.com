<?php

namespace App\Observers;

use App\Models\MenuItem;
use App\Services\FollowerBroadcaster;

/** Preço mudado avisa os seguidores — agrupado por janela (ver
 * FollowerBroadcaster::priceChanged), nunca um aviso por prato. */
class MenuItemObserver
{
    public function __construct(private readonly FollowerBroadcaster $broadcaster) {}

    public function updated(MenuItem $item): void
    {
        if ($item->restaurant_id && $item->wasChanged('price')) {
            $this->broadcaster->priceChanged($item->restaurant_id);
        }
    }
}
