<?php

namespace App\Http\Resources\Api\V1;

use App\Models\Offer;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Offer */
class OfferResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->uuid,
            'restaurantId' => $this->whenLoaded('restaurant', fn () => $this->restaurant?->uuid),
            'type' => $this->type,
            'title' => $this->title,
            'description' => $this->description,
            'code' => $this->code,
            'percentOff' => $this->percent_off,
            'imageUrl' => $this->image_url,
            'mediaType' => $this->media_type,
            'thumbnailUrl' => $this->thumbnail_url,
            'layout' => $this->layout,
            'processingStatus' => $this->processing_status,
            'startsAt' => $this->starts_at?->toIso8601String(),
            'endsAt' => $this->ends_at?->toIso8601String(),
        ];
    }
}
