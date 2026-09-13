<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\RestaurantResource;
use App\Models\Restaurant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class FavoriteController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        return RestaurantResource::collection($request->user()->favoriteRestaurants()->get());
    }

    public function store(Request $request, Restaurant $restaurant): JsonResponse
    {
        $request->user()->favoriteRestaurants()->syncWithoutDetaching($restaurant->id);

        return response()->json(status: 204);
    }

    public function destroy(Request $request, Restaurant $restaurant): JsonResponse
    {
        $request->user()->favoriteRestaurants()->detach($restaurant->id);

        return response()->json(status: 204);
    }
}
