<?php

namespace App\Http\Resources\Api\V1;

use App\Models\PackageType;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin PackageType */
class PackageTypeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->uuid,
            'name' => $this->name,
            'description' => $this->description,
            'icon' => $this->icon,
            'position' => $this->position,
            'isActive' => $this->is_active,
        ];
    }
}
