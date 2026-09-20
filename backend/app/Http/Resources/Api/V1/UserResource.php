<?php

namespace App\Http\Resources\Api\V1;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin User */
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->uuid,
            'role' => $this->role,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'avatarUrl' => $this->avatar_url,
            'restaurants' => $this->whenLoaded('restaurantUsers', fn () => $this->restaurantUsers->map(fn ($ru) => [
                'restaurantId' => $ru->restaurant->uuid,
                'restaurantName' => $ru->restaurant->name,
                'roleInRestaurant' => $ru->role_in_restaurant,
            ])),
        ];
    }
}
