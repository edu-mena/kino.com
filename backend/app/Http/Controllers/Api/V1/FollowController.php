<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\RestaurantResource;
use App\Models\FollowInvite;
use App\Models\Restaurant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Seguir um restaurante — substitui os antigos favoritos de restaurante
 * (favoritos ficam só para pratos/bebidas). Quem segue recebe avisos de
 * stories, promoções e preços (ver FollowerBroadcaster), desligáveis por
 * restaurante sem deixar de seguir (`notify`).
 */
class FollowController extends Controller
{
    /** Restaurantes seguidos, com o estado do sino de cada um. */
    public function index(Request $request): JsonResponse
    {
        $restaurants = $request->user()->followedRestaurants()
            ->orderByPivot('created_at', 'desc')
            ->get();

        return response()->json([
            'data' => $restaurants->map(fn (Restaurant $r) => [
                'restaurant' => new RestaurantResource($r),
                'notify' => (bool) $r->pivot->notify,
                'followedAt' => $r->pivot->created_at?->toIso8601String(),
            ]),
        ]);
    }

    public function store(Request $request, Restaurant $restaurant): JsonResponse
    {
        $request->user()->followedRestaurants()->syncWithoutDetaching([
            $restaurant->id => ['notify' => true],
        ]);

        // Seguiu depois de um convite "siga-nos" — fica registado como aceite.
        FollowInvite::query()
            ->where('restaurant_id', $restaurant->id)
            ->where('user_id', $request->user()->id)
            ->whereNull('accepted_at')
            ->update(['accepted_at' => now()]);

        return $this->state($restaurant, true, true);
    }

    /** Liga/desliga o sino sem deixar de seguir. */
    public function update(Request $request, Restaurant $restaurant): JsonResponse
    {
        $data = $request->validate(['notify' => ['required', 'boolean']]);

        $updated = $request->user()->followedRestaurants()
            ->updateExistingPivot($restaurant->id, ['notify' => $data['notify']]);
        abort_if($updated === 0, 404);

        return $this->state($restaurant, true, $data['notify']);
    }

    public function destroy(Request $request, Restaurant $restaurant): JsonResponse
    {
        $request->user()->followedRestaurants()->detach($restaurant->id);

        return $this->state($restaurant, false, false);
    }

    private function state(Restaurant $restaurant, bool $following, bool $notify): JsonResponse
    {
        return response()->json(['data' => [
            'restaurantId' => $restaurant->uuid,
            'following' => $following,
            'notify' => $notify,
            'followersCount' => $restaurant->followers()->count(),
        ]]);
    }
}
