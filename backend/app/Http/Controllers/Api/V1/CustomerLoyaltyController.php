<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Restaurant;
use App\Services\CustomerLoyaltyService;
use App\Services\PlanLimitService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Clientes Gold/Platina (só pelo gasto) — regra em CustomerLoyaltyService. */
class CustomerLoyaltyController extends Controller
{
    public function __construct(private readonly CustomerLoyaltyService $loyalty) {}

    /** Staff: estatuto de cada cliente do restaurante (o staff já vê os
     * contactos destes clientes nas reservas/pedidos — é por eles que o
     * front casa cada linha com a sua lista de clientes). */
    public function forRestaurant(Request $request, Restaurant $restaurant, PlanLimitService $planLimits): JsonResponse
    {
        $this->authorize('manageOperations', $restaurant);
        abort_unless($planLimits->allows($restaurant, 'customers'), 403, 'plan_locked');

        return response()->json([
            'data' => [
                'thresholds' => $this->thresholds(),
                'customers' => $this->loyalty->forRestaurant($restaurant),
            ],
        ]);
    }

    /** Cliente: o próprio estatuto em cada restaurante onde tem histórico. */
    public function mine(Request $request): JsonResponse
    {
        $rows = $this->loyalty->forUser($request->user());
        $uuids = Restaurant::query()->whereIn('id', $rows->pluck('restaurantId'))->pluck('uuid', 'id');

        return response()->json([
            'data' => [
                'thresholds' => $this->thresholds(),
                'restaurants' => $rows
                    ->filter(fn (array $r) => $uuids->has($r['restaurantId']))
                    ->map(fn (array $r) => [...$r, 'restaurantId' => $uuids[$r['restaurantId']]])
                    ->values(),
            ],
        ]);
    }

    /** @return array{gold: int, platinumAbove: int} */
    private function thresholds(): array
    {
        return [
            'gold' => CustomerLoyaltyService::GOLD_MIN_SPEND,
            'platinumAbove' => CustomerLoyaltyService::PLATINUM_ABOVE_SPEND,
        ];
    }
}
