<?php

namespace App\Http\Resources\Api\V1;

use App\Models\RestaurantStory;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin RestaurantStory */
class StoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->uuid,
            'restaurantId' => $this->whenLoaded('restaurant', fn () => $this->restaurant?->uuid),
            'mediaUrl' => $this->media_url,
            'mediaType' => $this->media_type,
            'durationSec' => $this->duration_sec,
            'processingStatus' => $this->processing_status,
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }
}
