<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
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
}
