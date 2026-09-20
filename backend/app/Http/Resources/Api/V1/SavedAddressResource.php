<?php

namespace App\Http\Resources\Api\V1;

use App\Models\SavedAddress;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin SavedAddress */
class SavedAddressResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->uuid,
            'label' => $this->label,
            'line1' => $this->line1,
            'line2' => $this->line2,
            'isDefault' => $this->is_default,
            'lat' => $this->lat === null ? null : (float) $this->lat,
            'lng' => $this->lng === null ? null : (float) $this->lng,
        ];
    }
}
