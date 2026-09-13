<?php

namespace App\Observers;

use App\Models\MenuItem;
use App\Services\PriceLevelCalculator;

class MenuItemObserver
{
    public function __construct(private readonly PriceLevelCalculator $priceLevelCalculator) {}

    public function saved(MenuItem $menuItem): void
    {
        $this->priceLevelCalculator->recalculate($menuItem->restaurant);
    }

    public function deleted(MenuItem $menuItem): void
    {
        $this->priceLevelCalculator->recalculate($menuItem->restaurant);
    }
}
