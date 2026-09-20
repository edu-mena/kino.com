<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;

/** Invalida a listagem pública de restaurantes (`RestaurantController::index`,
 * cacheada 5min por geração — ver lá). Extraído para aqui porque mais do
 * que um controller precisa de invalidar isto: qualquer mudança que afete o
 * que aparece na listagem pública (dados do restaurante, e agora também o
 * estado da subscrição — `isSuspended` no `RestaurantResource`). */
class RestaurantIndexCache
{
    public static function forget(): void
    {
        Cache::increment('restaurants:index:generation');
    }
}
