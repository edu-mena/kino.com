<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Stories\StoreStoryRequest;
use App\Http\Resources\Api\V1\StoryResource;
use App\Jobs\ProcessUploadedVideoJob;
use App\Models\Restaurant;
use App\Models\RestaurantStory;
use App\Services\MediaUploadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class StoryController extends Controller
{
    /** Feed global — institucionais Luku + todos os restaurantes, últimas 24h. */
    public function index(): AnonymousResourceCollection
    {
        $stories = RestaurantStory::query()->with('restaurant')->fresh()->latest()->get();

        return StoryResource::collection($stories);
    }

    /** Deste restaurante + institucionais Luku, últimas 24h (ver mock,
     * getEffectiveStories — não filtra só pelo restaurante). */
    public function indexForRestaurant(Restaurant $restaurant): AnonymousResourceCollection
    {
        $stories = RestaurantStory::query()
            ->with('restaurant')
            ->fresh()
            ->where(fn ($q) => $q->where('restaurant_id', $restaurant->id)->orWhereNull('restaurant_id'))
            ->latest()
            ->get();

        return StoryResource::collection($stories);
    }

    public function store(StoreStoryRequest $request, Restaurant $restaurant, MediaUploadService $uploads): JsonResponse
    {
        $this->authorize('manageOperations', $restaurant);

        return $this->handleUpload($request, $uploads, ['restaurant_id' => $restaurant->id], $restaurant->uuid);
    }

    /** Story institucional Luku (restaurant_id null) — só system_operator. */
    public function storeGlobal(StoreStoryRequest $request, MediaUploadService $uploads): JsonResponse
    {
        abort_unless($request->user()->isSystemOperator(), 403);

        return $this->handleUpload($request, $uploads, ['restaurant_id' => null], 'global');
    }

    public function destroy(RestaurantStory $story, MediaUploadService $uploads): JsonResponse
    {
        if ($story->restaurant_id === null) {
            abort_unless(request()->user()->isSystemOperator(), 403);
        } else {
            $this->authorize('manageOperations', $story->restaurant);
        }

        if ($story->processing_status === 'ready') {
            $uploads->deleteByUrl($story->media_url);
        }
        $story->delete();

        return response()->json(status: 204);
    }

    private function handleUpload(
        StoreStoryRequest $request,
        MediaUploadService $uploads,
        array $ownerAttributes,
        string $ownerSegment,
    ): JsonResponse {
        $file = $request->file('media');
        $isVideo = str_starts_with((string) $file->getMimeType(), 'video/');

        $story = RestaurantStory::query()->create([
            ...$ownerAttributes,
            // '' provisório enquanto processing (coluna NOT NULL) — nunca
            // exposto: StoryResource/scopeFresh só mostram depois de 'ready'.
            'media_url' => $isVideo ? '' : $uploads->storeImage($file, 'story', $ownerSegment),
            'media_type' => $isVideo ? 'video' : 'image',
            'duration_sec' => $request->validated('duration_sec'),
            'processing_status' => $isVideo ? 'processing' : 'ready',
        ]);

        if ($isVideo) {
            $rawPath = $uploads->storeRawVideo($file, 'story', $ownerSegment);
            ProcessUploadedVideoJob::dispatch(
                RestaurantStory::class, $story->id, $rawPath, 'media_url', null, 'stories',
            );
        }

        return (new StoryResource($story))->response()->setStatusCode(201);
    }
}
