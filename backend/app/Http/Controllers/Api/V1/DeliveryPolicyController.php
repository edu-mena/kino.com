<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\DeliveryPolicy\UpdateDeliveryPolicyRequest;
use App\Models\DeliveryPolicy;
use Illuminate\Http\JsonResponse;

class DeliveryPolicyController extends Controller
{
    /** Pública — o frontend usa isto para estimar a taxa de entrega antes
     * do checkout (mesmos free_radius_km/per_km_surcharge_kz do
     * DeliveryFeeCalculator, sem duplicar a fórmula no cliente). */
    public function show(): JsonResponse
    {
        return $this->toResponse(DeliveryPolicy::current());
    }

    public function update(UpdateDeliveryPolicyRequest $request): JsonResponse
    {
        $policy = DeliveryPolicy::current();
        $policy->update($request->validated());

        return $this->toResponse($policy);
    }

    private function toResponse(DeliveryPolicy $policy): JsonResponse
    {
        return response()->json(['data' => [
            'freeRadiusKm' => (float) $policy->free_radius_km,
            'perKmSurchargeKz' => (float) $policy->per_km_surcharge_kz,
        ]]);
    }
}
