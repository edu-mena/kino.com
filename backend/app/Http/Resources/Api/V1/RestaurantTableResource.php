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
            'description' => $this->description,
            'features' => $this->features ?? [],
            'shape' => $this->shape ?? 'square',
            'isCombinable' => (bool) ($this->is_combinable ?? true),
            'isActive' => (bool) ($this->is_active ?? true),
            'sortOrder' => (int) ($this->sort_order ?? 0),
            'qrCode' => $this->whenLoaded('qrCode', fn () => $this->qrCode ? [
                'code' => $this->qrCode->code,
                'scans' => $this->qrCode->scans,
                'lastScannedAt' => $this->qrCode->last_scanned_at?->toIso8601String(),
            ] : null),
        ];
    }
}
