<?php

namespace App\Http\Resources\Api\V1;

use App\Models\MenuItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin MenuItem */
class MenuItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->uuid,
            'restaurantId' => $this->whenLoaded('restaurant', fn () => $this->restaurant->uuid),
            'menuId' => $this->whenLoaded('menu', fn () => $this->menu->uuid),
            'name' => $this->name,
            'description' => $this->description,
            'price' => (float) $this->price,
            'category' => $this->category,
            'imageUrl' => $this->image_url,
            'isAvailable' => $this->is_available,
            'portionInfo' => $this->portion_info,
            'prepTimeMinutes' => $this->prep_time_minutes,
            'isPromoted' => $this->is_promoted,
            'promotionLabel' => $this->promotion_label,
            'ingredients' => $this->whenLoaded('ingredients', fn () => $this->ingredients->map(fn ($i) => [
                'id' => $i->id,
                'name' => $i->name,
                'removable' => $i->removable,
                'extraPrice' => $i->extra_price === null ? null : (float) $i->extra_price,
            ])),
        ];
    }
}
