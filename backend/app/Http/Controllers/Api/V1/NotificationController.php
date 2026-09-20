<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\NotificationResource;
use App\Models\Notification;
use App\Models\Restaurant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class NotificationController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $notifications = $request->user()->notifications()
            ->with('restaurant')
            ->when($request->boolean('unread'), fn ($q) => $q->whereNull('read_at'))
            ->latest()
            ->cursorPaginate($request->integer('per_page', 30));

        return NotificationResource::collection($notifications);
    }

    public function indexForRestaurant(Request $request, Restaurant $restaurant): AnonymousResourceCollection
    {
        $this->authorize('manageOperations', $restaurant);

        $notifications = $restaurant->notifications()
            ->with('restaurant')
            ->when($request->boolean('unread'), fn ($q) => $q->whereNull('read_at'))
            ->latest()
            ->cursorPaginate($request->integer('per_page', 30));

        return NotificationResource::collection($notifications);
    }

    public function markRead(Request $request, Notification $notification): NotificationResource
    {
        $this->authorizeAccess($request, $notification);
        $notification->update(['read_at' => $notification->read_at ?? now()]);

        return new NotificationResource($notification);
    }

    /** Marca várias de uma vez (ver mock, `markManyRead`) — só as que
     * pertencerem mesmo a quem pede, ids de outra conta/restaurante são
     * ignorados silenciosamente em vez de dar erro (evita um oráculo de
     * "este id existe/não existe" para quem tentar adivinhar). */
    public function markManyRead(Request $request): JsonResponse
    {
        $request->validate(['ids' => ['required', 'array'], 'ids.*' => ['string']]);

        $query = Notification::query()->whereIn('uuid', $request->input('ids'))->whereNull('read_at');

        if ($restaurantId = $request->input('restaurant_id')) {
            $restaurant = Restaurant::query()->where('uuid', $restaurantId)->firstOrFail();
            $this->authorize('manageOperations', $restaurant);
            $query->where('restaurant_id', $restaurant->id);
        } else {
            $query->where('user_id', $request->user()->id);
        }

        $count = $query->update(['read_at' => now()]);

        return response()->json(['data' => ['updated' => $count]]);
    }

    private function authorizeAccess(Request $request, Notification $notification): void
    {
        if ($notification->user_id) {
            abort_unless($notification->user_id === $request->user()->id, 404);

            return;
        }

        abort_unless($request->user()->can('manageOperations', $notification->restaurant), 404);
    }
}
