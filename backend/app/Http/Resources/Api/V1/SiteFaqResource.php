<?php

namespace App\Http\Resources\Api\V1;

use App\Models\SiteFaq;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin SiteFaq */
class SiteFaqResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->uuid,
            'question' => $this->question,
            'answer' => $this->answer,
            'position' => $this->position,
        ];
    }
}
