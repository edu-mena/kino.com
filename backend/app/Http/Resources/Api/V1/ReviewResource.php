<?php

namespace App\Http\Resources\Api\V1;

use App\Models\Review;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Review */
class ReviewResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->uuid,
            'restaurantId' => $this->whenLoaded('restaurant', fn () => $this->restaurant->uuid),
            'customerName' => $this->customer_name,
            'rating' => $this->rating,
            'date' => $this->date?->toDateString(),
            'comment' => $this->comment,
            'tags' => $this->tags ?? [],
        ];
    }
}
