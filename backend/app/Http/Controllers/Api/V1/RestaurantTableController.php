<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\RestaurantTables\StoreRestaurantTableRequest;
use App\Http\Requests\Api\V1\RestaurantTables\UpdateRestaurantTableRequest;
use App\Http\Resources\Api\V1\RestaurantTableResource;
use App\Models\Restaurant;
use App\Models\RestaurantTable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class RestaurantTableController extends Controller
{
    public function index(Restaurant $restaurant): AnonymousResourceCollection
    {
        $this->authorize('manageOperations', $restaurant);

        return RestaurantTableResource::collection($restaurant->tables()->orderBy('name')->get());
    }

    public function store(StoreRestaurantTableRequest $request, Restaurant $restaurant): JsonResponse
    {
        $table = $restaurant->tables()->create($request->validated());

        return (new RestaurantTableResource($table))->response()->setStatusCode(201);
    }

    public function update(UpdateRestaurantTableRequest $request, RestaurantTable $table): RestaurantTableResource
    {
        $table->update($request->validated());

        return new RestaurantTableResource($table);
    }

    /** Apagar uma mesa desatribui-a de qualquer reserva (FK
     * nullOnDelete) — nunca bloqueado, mesmo padrão de assignTable. */
    public function destroy(RestaurantTable $table): JsonResponse
    {
        $this->authorize('manageOperations', $table->restaurant);

        $table->delete();

        return response()->json(status: 204);
    }
}
