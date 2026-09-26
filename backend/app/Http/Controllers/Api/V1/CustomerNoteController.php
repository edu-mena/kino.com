<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Restaurant;
use App\Services\PlanLimitService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** `customerKey` é o mesmo identificador usado em customerKey()/viewerKey()
 * do frontend (email, senão telefone) — não é um id de recurso próprio, por
 * isso não há model/uuid aqui, só uma chave (restaurant_id, customer_key). */
class CustomerNoteController extends Controller
{
    public function show(Request $request, Restaurant $restaurant, string $customerKey, PlanLimitService $planLimits): JsonResponse
    {
        $this->authorize('manageOperations', $restaurant);
        abort_unless($planLimits->allows($restaurant, 'customers'), 403, 'plan_locked');

        $note = $restaurant->customerNotes()->where('customer_key', $customerKey)->first();

        return response()->json(['data' => ['customerKey' => $customerKey, 'notes' => $note?->notes ?? '']]);
    }

    public function update(Request $request, Restaurant $restaurant, string $customerKey, PlanLimitService $planLimits): JsonResponse
    {
        $this->authorize('manageOperations', $restaurant);
        abort_unless($planLimits->allows($restaurant, 'customers'), 403, 'plan_locked');
        $request->validate(['notes' => ['required', 'string', 'max:2000']]);

        $restaurant->customerNotes()->updateOrCreate(
            ['customer_key' => $customerKey],
            ['notes' => $request->string('notes')],
        );

        return response()->json(['data' => ['customerKey' => $customerKey, 'notes' => $request->string('notes')]]);
    }
}
