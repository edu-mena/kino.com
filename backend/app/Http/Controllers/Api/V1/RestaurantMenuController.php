<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Menus\StoreRestaurantMenuRequest;
use App\Http\Requests\Api\V1\Menus\UpdateRestaurantMenuRequest;
use App\Http\Resources\Api\V1\RestaurantMenuResource;
use App\Models\Restaurant;
use App\Models\RestaurantMenu;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class RestaurantMenuController extends Controller
{
    public function index(Restaurant $restaurant): AnonymousResourceCollection
    {
        return RestaurantMenuResource::collection($restaurant->menus()->orderBy('name')->get());
    }

    public function store(StoreRestaurantMenuRequest $request, Restaurant $restaurant): JsonResponse
    {
        $menu = $restaurant->menus()->create($request->validated());

        return (new RestaurantMenuResource($menu))->response()->setStatusCode(201);
    }

    public function update(UpdateRestaurantMenuRequest $request, RestaurantMenu $menu): RestaurantMenuResource
    {
        $menu->update($request->validated());

        return new RestaurantMenuResource($menu);
    }

    /**
     * Nunca permite apagar o último cardápio de um restaurante (ver mock,
     * menus-store.ts) — todo restaurante precisa de pelo menos um. Também
     * bloqueia apagar um cardápio com pratos ainda dentro: a FK
     * `menu_items.menu_id` tem `cascadeOnDelete()` a nível de BD, então sem
     * este guard os pratos seriam apagados em cascata (hard delete,
     * ignorando o soft-delete do Eloquent) só por se ter apagado o
     * cardápio — o admin tem de mover/apagar os pratos primeiro.
     */
    public function destroy(RestaurantMenu $menu): JsonResponse
    {
        $this->authorize('update', $menu->restaurant);

        if ($menu->restaurant->menus()->count() <= 1) {
            return response()->json([
                'message' => 'Não é possível apagar o último cardápio do restaurante.',
            ], 422);
        }

        if ($menu->items()->exists()) {
            return response()->json([
                'message' => 'Move ou apaga os pratos deste cardápio antes de o apagar.',
            ], 422);
        }

        $menu->delete();

        return response()->json(status: 204);
    }
}
