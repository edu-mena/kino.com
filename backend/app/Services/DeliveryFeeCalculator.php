<?php

namespace App\Services;

use App\Models\DeliveryPolicy;

/**
 * Espelha `computeDeliveryFee`/`orderDistanceKm` do frontend
 * (src/lib/cart.tsx, src/lib/delivery-eval.ts) — com uma diferença
 * deliberada: o mock não tinha backend, então "distância" era um hash
 * determinístico fake só para dar uma estimativa estável na demo. Aqui há
 * lat/lng reais (restaurante + morada guardada), por isso usamos Haversine
 * a sério em vez de replicar o hash fake — é estritamente mais correto,
 * não uma mudança de regra de negócio.
 */
class DeliveryFeeCalculator
{
    /** Raio da Terra em km. */
    private const EARTH_RADIUS_KM = 6371;

    public function distanceKm(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return self::EARTH_RADIUS_KM * $c;
    }

    /**
     * Taxa de entrega: taxa base do restaurante + acréscimo por km acima do
     * raio livre da política da plataforma (DeliveryPolicy, singleton) —
     * mesma fórmula do `computeDeliveryFee` do mock.
     */
    public function calculate(float $baseFeeKz, float $distanceKm, ?DeliveryPolicy $policy = null): float
    {
        $policy ??= DeliveryPolicy::current();
        $extraKm = max(0, ceil($distanceKm - (float) $policy->free_radius_km));

        return $baseFeeKz + $extraKm * (float) $policy->per_km_surcharge_kz;
    }
}
