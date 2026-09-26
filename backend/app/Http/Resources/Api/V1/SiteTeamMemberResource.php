<?php

namespace App\Http\Resources\Api\V1;

use App\Models\SiteTeamMember;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin SiteTeamMember */
class SiteTeamMemberResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->uuid,
            'name' => $this->name,
            'role' => $this->role,
            'initials' => $this->initials,
            'photoUrl' => $this->photo_url,
            'position' => $this->position,
        ];
    }
}
