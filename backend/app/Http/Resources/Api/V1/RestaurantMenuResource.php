<?php

namespace App\Http\Resources\Api\V1;

use App\Models\RestaurantMenu;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin RestaurantMenu */
class RestaurantMenuResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->uuid,
            'restaurantId' => $this->whenLoaded('restaurant', fn () => $this->restaurant->uuid),
            'name' => $this->name,
            'isActive' => $this->is_active,
            'category' => $this->category,
        ];
    }
}
