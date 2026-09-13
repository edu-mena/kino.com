<?php

namespace App\Http\Resources\Api\V1;

use App\Models\BlockedIp;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin BlockedIp */
class BlockedIpResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'ip' => $this->ip,
            'reason' => $this->reason,
            'blockedAt' => $this->blocked_at->toIso8601String(),
        ];
    }
}
