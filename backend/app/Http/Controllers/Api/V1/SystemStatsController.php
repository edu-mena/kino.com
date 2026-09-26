<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\MenuItem;
use App\Models\Restaurant;
use App\Models\Review;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Estatísticas agregadas para o painel de sistema (`/sistema`) que não
 * pertencem a nenhum outro recurso — ver auditoria de go-live
 * (sistema.index.tsx, KPI "Clientes registados", sem endpoint nenhum antes
 * disto). */
class SystemStatsController extends Controller
{
    public function customersCount(Request $request): JsonResponse
    {
        abort_unless($request->user()->isSystemOperator(), 403);

        return response()->json([
            'data' => ['count' => User::query()->where('role', 'customer')->count()],
        ]);
    }

    /** Público — números "automáticos" da página /sobre (ver plano): nunca
     * escritos à mão, sempre calculados a partir dos dados reais. Restaurante
     * com subscrição bloqueada não conta como "parceiro ativo" — mesma regra
     * já usada em SendRestaurantDailyDigestsJob. */
    public function siteStats(): JsonResponse
    {
        $partnerRestaurants = Restaurant::query()
            ->whereDoesntHave('subscription', fn ($q) => $q->where('status', 'suspended'))
            ->count();

        $averageRating = (float) Review::query()->avg('rating');

        return response()->json(['data' => [
            'activeCustomers' => User::query()->where('role', 'customer')->count(),
            'partnerRestaurants' => $partnerRestaurants,
            'menuDishes' => MenuItem::query()->count(),
            'averageRating' => round($averageRating, 1),
        ]]);
    }
}
