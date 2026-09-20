<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Couriers\SetCourierStatusRequest;
use App\Http\Requests\Api\V1\Couriers\StoreCourierRequest;
use App\Http\Requests\Api\V1\Couriers\UpdateCourierRequest;
use App\Http\Resources\Api\V1\CourierResource;
use App\Models\Courier;
use App\Models\Restaurant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CourierController extends Controller
{
    public function index(Restaurant $restaurant): AnonymousResourceCollection
    {
        $this->authorize('manageOperations', $restaurant);

        return CourierResource::collection(
            $restaurant->couriers()->with('activeOrder')->orderBy('name')->get(),
        );
    }

    public function store(StoreCourierRequest $request, Restaurant $restaurant): JsonResponse
    {
        $courier = $restaurant->couriers()->create([...$request->validated(), 'status' => 'disponivel']);

        return (new CourierResource($courier))->response()->setStatusCode(201);
    }

    public function update(UpdateCourierRequest $request, Courier $courier): CourierResource
    {
        $courier->update($request->validated());

        return new CourierResource($courier);
    }

    public function setStatus(SetCourierStatusRequest $request, Courier $courier): CourierResource
    {
        $courier->update(['status' => $request->validated('status')]);

        return new CourierResource($courier);
    }

    /** Nunca remove um estafeta em entrega (ver mock, `removeCourier`). */
    public function destroy(Courier $courier): JsonResponse
    {
        $this->authorize('manageOperations', $courier->restaurant);
        abort_if($courier->status === 'em_entrega', 422, 'Este estafeta está em entrega — não pode ser removido agora.');

        $courier->delete();

        return response()->json(status: 204);
    }
}
