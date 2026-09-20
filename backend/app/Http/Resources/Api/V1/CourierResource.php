<?php

namespace App\Http\Resources\Api\V1;

use App\Models\Courier;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Courier */
class CourierResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->uuid,
            'name' => $this->name,
            'phone' => $this->phone,
            'vehicle' => $this->vehicle,
            'zone' => $this->zone,
            'status' => $this->status,
            'activeOrderId' => $this->whenLoaded('activeOrder', fn () => $this->activeOrder?->uuid),
        ];
    }
}
