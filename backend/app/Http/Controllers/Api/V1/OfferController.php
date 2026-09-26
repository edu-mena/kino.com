<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Offers\StoreOfferRequest;
use App\Http\Requests\Api\V1\Offers\UpdateOfferRequest;
use App\Http\Resources\Api\V1\OfferResource;
use App\Jobs\ProcessUploadedVideoJob;
use App\Models\Offer;
use App\Models\Restaurant;
use App\Services\MediaUploadService;
use App\Services\PlanLimitService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class OfferController extends Controller
{
    /** Feed global (carrossel da home) — ativas agora, de qualquer restaurante. */
    public function index(): AnonymousResourceCollection
    {
        $offers = Offer::query()->with('restaurant')->active()->latest()->get();

        return OfferResource::collection($offers);
    }

    /** Deste restaurante + institucionais Luku, ativas agora. */
    public function indexForRestaurant(Restaurant $restaurant): AnonymousResourceCollection
    {
        $offers = Offer::query()
            ->with('restaurant')
            ->active()
            ->where(fn ($q) => $q->where('restaurant_id', $restaurant->id)->orWhereNull('restaurant_id'))
            ->latest()
            ->get();

        return OfferResource::collection($offers);
    }

    public function store(
        StoreOfferRequest $request,
        Restaurant $restaurant,
        MediaUploadService $uploads,
        PlanLimitService $planLimits,
    ): JsonResponse {
        $this->authorize('manageOperations', $restaurant);
        abort_unless($planLimits->hasCapacity($restaurant, 'offers'), 403, 'plan_limit_reached');

        return $this->handleCreate($request, $uploads, ['restaurant_id' => $restaurant->id], $restaurant->uuid);
    }

    /** Promoção global Luku (restaurant_id null) — só system_operator (ver
     * plano: gerida em /sistema/promocoes, nunca no painel do restaurante). */
    public function storeGlobal(StoreOfferRequest $request, MediaUploadService $uploads): JsonResponse
    {
        abort_unless($request->user()->isSystemOperator(), 403);

        return $this->handleCreate($request, $uploads, ['restaurant_id' => null], 'global');
    }

    public function update(UpdateOfferRequest $request, Offer $offer, MediaUploadService $uploads): OfferResource
    {
        $data = $request->validated();
        $media = $request->file('media');
        unset($data['media']);
        $data = $this->mapTargeting($data);

        if ($media) {
            $ownerSegment = $offer->restaurant?->uuid ?? 'global';
            $isVideo = str_starts_with((string) $media->getMimeType(), 'video/');

            if ($offer->image_url) {
                $uploads->deleteByUrl($offer->image_url);
            }

            if ($isVideo) {
                $data['image_url'] = null;
                $data['media_type'] = 'video';
                $data['processing_status'] = 'processing';
            } else {
                $data['image_url'] = $uploads->storeImage($media, 'promo', $ownerSegment);
                $data['media_type'] = 'image';
                $data['processing_status'] = 'ready';
                $data['thumbnail_url'] = null;
            }

            $offer->update($data);

            if ($isVideo) {
                $rawPath = $uploads->storeRawVideo($media, 'promo', $ownerSegment);
                ProcessUploadedVideoJob::dispatch(
                    Offer::class, $offer->id, $rawPath, 'image_url', 'thumbnail_url', 'promo',
                );
            }
        } else {
            $offer->update($data);
        }

        return new OfferResource($offer->fresh());
    }

    public function destroy(Offer $offer, MediaUploadService $uploads): JsonResponse
    {
        if ($offer->restaurant_id === null) {
            abort_unless(request()->user()->isSystemOperator(), 403);
        } else {
            $this->authorize('manageOperations', $offer->restaurant);
        }

        $uploads->deleteByUrl($offer->image_url);
        $offer->delete();

        return response()->json(status: 204);
    }

    private function handleCreate(
        StoreOfferRequest $request,
        MediaUploadService $uploads,
        array $ownerAttributes,
        string $ownerSegment,
    ): JsonResponse {
        $data = $request->validated();
        $media = $request->file('media');
        unset($data['media']);
        $data = $this->mapTargeting($data);

        $isVideo = $media && str_starts_with((string) $media->getMimeType(), 'video/');

        $offer = Offer::query()->create([
            ...$ownerAttributes,
            ...$data,
            'starts_at' => $data['starts_at'] ?? now(),
            'image_url' => $media && ! $isVideo ? $uploads->storeImage($media, 'promo', $ownerSegment) : null,
            'media_type' => $isVideo ? 'video' : 'image',
            'processing_status' => $isVideo ? 'processing' : 'ready',
        ]);

        if ($isVideo) {
            $rawPath = $uploads->storeRawVideo($media, 'promo', $ownerSegment);
            ProcessUploadedVideoJob::dispatch(
                Offer::class, $offer->id, $rawPath, 'image_url', 'thumbnail_url', 'promo',
            );
        }

        return (new OfferResource($offer))->response()->setStatusCode(201);
    }

    /** `menu_item_ids`/`categories` (nomes do pedido, mais claros para quem
     * consome a API) → `target_menu_item_ids`/`target_categories` (colunas
     * da BD) — sem isto, `Offer::create`/`update` ignora-os em silêncio
     * (não são `$fillable` com o nome do pedido). */
    private function mapTargeting(array $data): array
    {
        if (array_key_exists('menu_item_ids', $data)) {
            $data['target_menu_item_ids'] = $data['menu_item_ids'];
            unset($data['menu_item_ids']);
        }
        if (array_key_exists('categories', $data)) {
            $data['target_categories'] = $data['categories'];
            unset($data['categories']);
        }

        return $data;
    }
}
