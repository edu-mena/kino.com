<?php

namespace App\Http\Resources\Api\V1;

use App\Models\SiteTestimonial;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin SiteTestimonial */
class SiteTestimonialResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->uuid,
            'name' => $this->name,
            'role' => $this->role,
            'quote' => $this->quote,
            'initials' => $this->initials,
            'photoUrl' => $this->photo_url,
            'position' => $this->position,
        ];
    }
}
