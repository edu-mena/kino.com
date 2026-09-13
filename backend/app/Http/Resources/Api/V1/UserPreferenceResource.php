<?php

namespace App\Http\Resources\Api\V1;

use App\Models\UserPreference;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin UserPreference */
class UserPreferenceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'dietaryRestrictions' => $this->dietary_restrictions ?? [],
            'language' => $this->language,
            'notificationsEnabled' => $this->notifications_enabled ?? true,
        ];
    }
}
