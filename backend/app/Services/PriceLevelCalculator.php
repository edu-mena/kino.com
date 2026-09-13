<?php

namespace App\Services;

use App\Models\Restaurant;

/**
 * `Restaurant.price_level` nunca é gravável via API (fora de $fillable) —
 * é sempre recalculado daqui, a partir da média de preços do cardápio ativo
 * (mesma regra do mock: src/data/helpers.ts). Chamado por
 * App\Observers\MenuItemObserver sempre que um prato é criado/atualizado/
 * apagado/tem o preço mudado.
 */
class PriceLevelCalculator
{
    /** 4 faixas (€/Kz "$" a "$$$$"), limiares calibrados ao mercado
     * angolano (AOA) — mesmos cortes usados no mock. */
    private const THRESHOLDS = [2500, 6000, 12000];

    public function recalculate(Restaurant $restaurant): void
    {
        $average = $restaurant->menuItems()
            ->where('is_available', true)
            ->avg('price');

        $restaurant->forceFill(['price_level' => $this->levelFor($average)])->saveQuietly();
    }

    private function levelFor(?float $average): ?int
    {
        if ($average === null) {
            return null; // sem pratos disponíveis — sem faixa de preço ainda
        }

        foreach (self::THRESHOLDS as $i => $threshold) {
            if ($average < $threshold) {
                return $i + 1;
            }
        }

        return count(self::THRESHOLDS) + 1;
    }
}
