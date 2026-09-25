<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\MenuItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Pratos e bebidas favoritos do cliente — só ids (o front já tem os itens
 * carregados para o cardápio/recomendações; ver @/lib/preferences).
 */
class FavoriteMenuItemController extends Controller
{
    /** Máximo de ids aceites de uma vez em `sync` (favoritos antigos do
     * browser a subir no 1º login). */
    public const SYNC_LIMIT = 200;

    public function index(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->ids($request)]);
    }

    public function store(Request $request, MenuItem $menuItem): JsonResponse
    {
        $request->user()->favoriteMenuItems()->syncWithoutDetaching($menuItem->id);

        return response()->json(['data' => $this->ids($request)]);
    }

    public function destroy(Request $request, MenuItem $menuItem): JsonResponse
    {
        $request->user()->favoriteMenuItems()->detach($menuItem->id);

        return response()->json(['data' => $this->ids($request)]);
    }

    /** Junta (nunca substitui) os ids dados aos favoritos da conta — ids
     * desconhecidos/apagados são ignorados, não dão erro. */
    public function sync(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'max:'.self::SYNC_LIMIT],
            'ids.*' => ['string'],
        ]);

        // Ids que nem são uuid (ex: ids do dataset de demo guardados no
        // browser) ficam de fora antes de chegar ao Postgres — a coluna é
        // `uuid` e um valor inválido rebentava a query inteira.
        $uuids = array_values(array_filter($data['ids'], fn (string $id) => Str::isUuid($id)));
        $internalIds = MenuItem::query()->whereIn('uuid', $uuids)->pluck('id');
        $request->user()->favoriteMenuItems()->syncWithoutDetaching($internalIds);

        return response()->json(['data' => $this->ids($request)]);
    }

    /** @return list<string> */
    private function ids(Request $request): array
    {
        return $request->user()->favoriteMenuItems()
            ->orderByPivot('created_at', 'desc')
            ->pluck('menu_items.uuid')
            ->all();
    }
}
