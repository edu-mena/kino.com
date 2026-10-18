<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Restaurant;
use App\Models\User;
use App\Services\SeededRestaurants\SeededRestaurantGenerator;
use App\Support\RestaurantIndexCache;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * /sistema/gerados — restaurantes criados por `restaurants:seed-demo`.
 * Todas as ações só alguma vez tocam restaurantes com `seed_batch` (nunca
 * um restaurante real), por restaurante ou o lote inteiro.
 */
class SystemSeededRestaurantController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->assertOperator($request);

        $rows = Restaurant::withTrashed()
            ->whereNotNull('seed_batch')
            ->withCount('menuItems')
            ->with(['staff' => fn ($q) => $q->select('users.id', 'users.email')])
            ->orderByRaw("CASE WHEN city = 'Luanda' THEN 0 ELSE 1 END")
            ->orderBy('city')
            ->orderBy('name')
            ->get()
            ->map(fn (Restaurant $r) => [
                'id' => $r->uuid,
                'name' => $r->name,
                'cuisine' => $r->cuisine,
                'province' => $r->city,
                'neighborhood' => $r->neighborhood,
                'batch' => $r->seed_batch,
                'active' => $r->is_published && ! $r->trashed(),
                'modes' => $r->fulfillment_modes ?? [],
                'acceptsReservations' => (bool) $r->accepts_reservations,
                'menuItems' => $r->menu_items_count,
                'ownerEmail' => $r->staff->first()?->email,
            ]);

        return response()->json(['data' => $rows]);
    }

    public function activate(Request $request): JsonResponse
    {
        return $this->setActive($request, true);
    }

    public function deactivate(Request $request): JsonResponse
    {
        return $this->setActive($request, false);
    }

    /** Apaga DE VEZ: restaurante, cardápio, mesas, pedidos/reservas
     * (cascata na base de dados) e as contas @demo.luku.ao que só serviam
     * esse restaurante. */
    public function destroy(Request $request): JsonResponse
    {
        $this->assertOperator($request);
        $restaurants = $this->selected($request)->withTrashed()->with('staff:users.id,users.email')->get();

        $deleted = 0;
        DB::transaction(function () use ($restaurants, &$deleted) {
            foreach ($restaurants as $restaurant) {
                $owners = $restaurant->staff;
                $restaurant->forceDelete();
                $deleted++;

                foreach ($owners as $owner) {
                    $isSeedAccount = str_ends_with((string) $owner->email, '@'.SeededRestaurantGenerator::EMAIL_DOMAIN);
                    if ($isSeedAccount && ! DB::table('restaurant_users')->where('user_id', $owner->id)->exists()) {
                        User::withTrashed()->find($owner->id)?->forceDelete();
                    }
                }
            }
        });
        RestaurantIndexCache::forget();

        return response()->json(['data' => ['deleted' => $deleted]]);
    }

    private function setActive(Request $request, bool $active): JsonResponse
    {
        $this->assertOperator($request);
        $count = $this->selected($request)->update(['is_published' => $active]);
        RestaurantIndexCache::forget();

        return response()->json(['data' => ['updated' => $count]]);
    }

    /** `ids` (uuids) ou `all: true` — sempre limitado aos gerados. */
    private function selected(Request $request): Builder
    {
        $data = $request->validate([
            'all' => ['sometimes', 'boolean'],
            'ids' => ['required_without:all', 'array'],
            'ids.*' => ['string'],
        ]);

        return Restaurant::query()
            ->whereNotNull('seed_batch')
            ->when(! ($data['all'] ?? false), fn ($q) => $q->whereIn('uuid', $data['ids'] ?? []));
    }

    private function assertOperator(Request $request): void
    {
        abort_unless($request->user()?->isSystemOperator(), 403);
    }
}
