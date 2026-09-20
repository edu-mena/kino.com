<?php

namespace App\Http\Resources\Api\V1;

use App\Models\RestaurantSubscription;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin RestaurantSubscription */
class SubscriptionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'restaurantId' => $this->whenLoaded('restaurant', fn () => $this->restaurant->uuid, $this->restaurant_id),
            'plan' => $this->plan,
            'startedAt' => $this->started_at?->toIso8601String(),
            'trialEndsAt' => $this->trial_ends_at?->toIso8601String(),
            'status' => $this->status,
            'lastPaymentAt' => $this->last_payment_at?->toIso8601String(),
            'locked' => $this->isLocked(),
            'trialDaysLeft' => $this->trialDaysLeft(),
        ];
    }
}
