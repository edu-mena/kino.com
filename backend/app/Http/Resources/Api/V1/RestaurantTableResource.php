<?php

namespace App\Http\Resources\Api\V1;

use App\Models\RestaurantTable;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin RestaurantTable */
class RestaurantTableResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->uuid,
            'name' => $this->name,
            'seats' => $this->seats,
            'area' => $this->area,
        ];
    }
}
