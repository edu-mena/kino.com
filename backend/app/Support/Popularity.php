<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;

/**
 * O que conta como "popular" nas listagens de cliente (restaurantes e
 * pratos): pedidos dos últimos 30 dias, sem os recusados/cancelados — gente
 * a comprar agora, não histórico antigo. Um sítio só, para restaurantes e
 * pratos contarem da mesma maneira.
 */
class Popularity
{
    public const WINDOW_DAYS = 30;

    public static function recentOrders(Builder $orders): Builder
    {
        return $orders
            ->where('created_at', '>=', now()->subDays(self::WINDOW_DAYS))
            ->whereNotIn('status', ['rejected', 'canceled']);
    }
}
