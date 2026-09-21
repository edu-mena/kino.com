<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Menus\StoreMenuItemRequest;
use App\Http\Requests\Api\V1\Menus\UpdateMenuItemRequest;
use App\Http\Resources\Api\V1\MenuItemResource;
use App\Models\MenuItem;
use App\Models\Restaurant;
use App\Models\RestaurantMenu;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class MenuItemController extends Controller
{
    public function index(Request $request, Restaurant $restaurant): AnonymousResourceCollection
    {
        $items = QueryBuilder::for($restaurant->menuItems()->getQuery())
            ->allowedFilters(
                AllowedFilter::exact('category'),
                AllowedFilter::exact('menu_id'),
                AllowedFilter::exact('is_available'),
            )
            ->allowedSorts('name', 'price')
            ->defaultSort('category', 'name')
            // `menu` também precisa de estar carregado — `MenuItemResource`
            // só devolve `menuId` com `whenLoaded('menu', ...)`; sem isto o
            // campo desaparecia da resposta e o frontend nunca conseguia
            // agrupar os pratos pelo cardápio real (PDF/QR mostravam 0 pratos).
            ->with(['ingredients', 'menu'])
            ->cursorPaginate($request->integer('per_page', 30));

        return MenuItemResource::collection($items);
    }

    public function store(StoreMenuItemRequest $request, Restaurant $restaurant): JsonResponse
    {
        $data = $request->validated();
        $ingredients = $data['ingredients'] ?? [];
        unset($data['ingredients']);
        // `menu_id` chega como uuid (único id que a API expõe, ver
        // StoreMenuItemRequest) — resolve para o id interno antes de gravar.
        $data['menu_id'] = RestaurantMenu::where('uuid', $data['menu_id'])->value('id');

        $item = DB::transaction(function () use ($restaurant, $data, $ingredients) {
            $item = $restaurant->menuItems()->create($data);
            foreach ($ingredients as $position => $ingredient) {
                $item->ingredients()->create([...$ingredient, 'position' => $position]);
            }

            return $item;
        });

        return (new MenuItemResource($item->load('ingredients')))->response()->setStatusCode(201);
    }

    public function update(UpdateMenuItemRequest $request, MenuItem $menuItem): MenuItemResource
    {
        $data = $request->validated();
        $ingredients = $data['ingredients'] ?? null;
        unset($data['ingredients']);
        if (array_key_exists('menu_id', $data)) {
            $data['menu_id'] = RestaurantMenu::where('uuid', $data['menu_id'])->value('id');
        }

        DB::transaction(function () use ($menuItem, $data, $ingredients) {
            $menuItem->update($data);

            if ($ingredients !== null) {
                $menuItem->ingredients()->delete();
                foreach ($ingredients as $position => $ingredient) {
                    $menuItem->ingredients()->create([...$ingredient, 'position' => $position]);
                }
            }
        });

        return new MenuItemResource($menuItem->fresh('ingredients'));
    }

    public function destroy(MenuItem $menuItem): JsonResponse
    {
        $this->authorize('update', $menuItem->restaurant);

        $menuItem->delete(); // soft delete — order_lines guardam snapshot próprio

        return response()->json(status: 204);
    }
}
