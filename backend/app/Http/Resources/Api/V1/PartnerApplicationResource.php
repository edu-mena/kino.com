<?php

namespace App\Http\Resources\Api\V1;

use App\Models\PartnerApplication;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin PartnerApplication */
class PartnerApplicationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->uuid,
            'restaurantName' => $this->restaurant_name,
            'ownerName' => $this->owner_name,
            'phone' => $this->phone,
            'email' => $this->email,
            'province' => $this->province,
            'message' => $this->message,
            'status' => $this->status,
            'createdRestaurantId' => $this->whenLoaded('createdRestaurant', fn () => $this->createdRestaurant?->uuid),
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }
}
