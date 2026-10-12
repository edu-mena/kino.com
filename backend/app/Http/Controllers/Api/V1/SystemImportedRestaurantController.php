<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\ActivateImportedRestaurant;
use App\Http\Controllers\Controller;
use App\Models\MenuItem;
use App\Models\Restaurant;
use App\Models\RestaurantImport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * /sistema/importados — restaurantes pré-cadastrados a partir do menus.ao
 * (ver MenusAoImporter). Só operadores de sistema: listar, pré-visualizar o
 * cardápio, ativar (público + conta do dono), descartar e repor.
 */
class SystemImportedRestaurantController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->assertOperator($request);

        $status = $request->string('status', 'pending')->toString();
        $imports = RestaurantImport::query()
            ->with(['restaurant' => fn ($q) => $q->withTrashed()->withCount('menuItems')])
            ->when($status === 'pending', fn ($q) => $q->whereNull('activated_at')->whereNull('discarded_at'))
            ->when($status === 'active', fn ($q) => $q->whereNotNull('activated_at'))
            ->when($status === 'discarded', fn ($q) => $q->whereNotNull('discarded_at'))
            ->orderByDesc('synced_at')
            ->get()
            ->filter(fn (RestaurantImport $i) => $i->restaurant !== null);

        return response()->json([
            'data' => $imports->map(fn (RestaurantImport $i) => $this->row($i))->values(),
            'counts' => [
                'pending' => RestaurantImport::query()->whereNull('activated_at')->whereNull('discarded_at')->count(),
                'active' => RestaurantImport::query()->whereNotNull('activated_at')->count(),
                'discarded' => RestaurantImport::query()->whereNotNull('discarded_at')->count(),
            ],
        ]);
    }

    /** Pré-visualização: dados + horário + cardápio por categoria. */
    public function show(Request $request, Restaurant $restaurant): JsonResponse
    {
        $this->assertOperator($request);
        $import = $restaurant->import;
        abort_unless($import, 404);

        $restaurant->load('hours.ranges');
        $items = MenuItem::query()
            ->with(['ingredients' => fn ($q) => $q->orderBy('position')])
            ->where('restaurant_id', $restaurant->id)
            ->orderBy('id')
            ->get(['id', 'uuid', 'name', 'description', 'price', 'category', 'image_url']);

        return response()->json(['data' => [
            ...$this->row($import->setRelation('restaurant', $restaurant)),
            'hours' => $restaurant->hours->sortBy('weekday')->map(fn ($h) => [
                'weekday' => $h->weekday,
                'isOpen' => $h->is_open,
                'ranges' => $h->ranges->map(fn ($r) => [
                    'start' => substr((string) $r->start_time, 0, 5),
                    'end' => substr((string) $r->end_time, 0, 5),
                ])->values(),
            ])->values(),
            'categories' => $items->groupBy('category')->map(fn ($group, $category) => [
                'name' => $category,
                'items' => $group->map(fn (MenuItem $m) => [
                    'id' => $m->uuid,
                    'name' => $m->name,
                    'description' => $m->description,
                    'price' => (float) $m->price,
                    'imageUrl' => $m->image_url,
                    'ingredients' => $m->ingredients->pluck('name')->values(),
                ])->values(),
            ])->values(),
        ]]);
    }

    public function activate(Request $request, Restaurant $restaurant, ActivateImportedRestaurant $action): JsonResponse
    {
        $this->assertOperator($request);
        abort_unless($restaurant->import, 404);

        $data = $request->validate([
            'owner_name' => ['required', 'string', 'max:150'],
            'owner_email' => ['required', 'email', 'max:190'],
            'owner_phone' => ['sometimes', 'nullable', 'string', 'max:30'],
            'public_phone' => ['sometimes', 'nullable', 'string', 'max:30'],
            'public_email' => ['sometimes', 'nullable', 'email', 'max:190'],
        ]);
        $data['owner_email'] = mb_strtolower(trim($data['owner_email']));

        $restaurant = $action->handle($restaurant, $data);

        return response()->json(['data' => $this->row($restaurant->import->setRelation('restaurant', $restaurant))]);
    }

    /** Descartar: sai da lista de "por ativar" e nunca mais é reimportado
     * (até ser reposto). Um restaurante já ativo não se descarta aqui. */
    public function destroy(Request $request, Restaurant $restaurant): JsonResponse
    {
        $this->assertOperator($request);
        $import = $restaurant->import;
        abort_unless($import, 404);
        abort_if($restaurant->is_published, 422, 'Um restaurante já ativo não pode ser descartado aqui.');

        $import->update(['discarded_at' => now()]);
        $restaurant->delete();

        return response()->json(status: 204);
    }

    public function restore(Request $request, string $uuid): JsonResponse
    {
        $this->assertOperator($request);
        $restaurant = Restaurant::withTrashed()->where('uuid', $uuid)->firstOrFail();
        $import = $restaurant->import;
        abort_unless($import?->discarded_at, 404);

        $restaurant->restore();
        $import->update(['discarded_at' => null]);

        return response()->json(['data' => $this->row($import->setRelation('restaurant', $restaurant))]);
    }

    private function assertOperator(Request $request): void
    {
        abort_unless($request->user()?->isSystemOperator(), 403);
    }

    /** @return array<string, mixed> */
    private function row(RestaurantImport $import): array
    {
        $r = $import->restaurant;

        return [
            'id' => $r->uuid,
            'name' => $r->name,
            'address' => $r->address,
            'province' => $r->neighborhood,
            'cuisine' => $r->cuisine,
            'coverImageUrl' => $r->cover_image_url,
            'logoUrl' => $r->logo_url,
            'isPublished' => (bool) $r->is_published,
            'itemCount' => $r->menu_items_count ?? $r->menuItems()->count(),
            'source' => ['slug' => $import->source_slug, 'url' => $import->source_url],
            'contactPhone' => $import->contact_phone,
            'contactEmail' => $import->contact_email,
            'stats' => $import->stats ?? (object) [],
            'syncedAt' => $import->synced_at?->toIso8601String(),
            'activatedAt' => $import->activated_at?->toIso8601String(),
            'discardedAt' => $import->discarded_at?->toIso8601String(),
        ];
    }
}
