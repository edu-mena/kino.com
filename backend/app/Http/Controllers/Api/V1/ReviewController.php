<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Reviews\StoreReviewRequest;
use App\Http\Resources\Api\V1\ReviewResource;
use App\Models\Restaurant;
use App\Models\Review;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ReviewController extends Controller
{
    public function index(Request $request, Restaurant $restaurant): AnonymousResourceCollection
    {
        $reviews = $restaurant->reviews()
            ->latest('date')
            ->cursorPaginate($request->integer('per_page', 20));

        return ReviewResource::collection($reviews);
    }

    public function store(StoreReviewRequest $request, Restaurant $restaurant): JsonResponse
    {
        $data = $request->validated();

        $review = $restaurant->reviews()->create([
            'user_id' => $request->user()->id,
            'customer_name' => $request->user()->name,
            'rating' => $data['rating'],
            'date' => now()->toDateString(),
            'comment' => $data['comment'] ?? null,
            'tags' => $data['tags'] ?? [],
            'ref_type' => $data['ref_type'] ?? null,
            'ref_id' => $request->resolvedRefId,
        ]);

        return (new ReviewResource($review))->response()->setStatusCode(201);
    }

    /** Moderação — só system_operator, nunca o próprio restaurante (não
     * pode apagar reviews negativas). */
    public function destroy(Request $request, Review $review): JsonResponse
    {
        abort_unless($request->user()->isSystemOperator(), 403);

        $review->delete();

        return response()->json(status: 204);
    }
}
