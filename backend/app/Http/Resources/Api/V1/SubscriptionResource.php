<?php

namespace App\Http\Resources\Api\V1;

use App\Models\RestaurantSubscription;
use App\Services\PlanLimitService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin RestaurantSubscription */
class SubscriptionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $limits = app(PlanLimitService::class);
        $features = ['stories', 'offers', 'reservations_per_month'];

        return [
            'restaurantId' => $this->whenLoaded('restaurant', fn () => $this->restaurant->uuid, $this->restaurant_id),
            'plan' => $this->plan,
            'price' => $limits->priceFor($this->plan),
            'startedAt' => $this->started_at?->toIso8601String(),
            'trialEndsAt' => $this->trial_ends_at?->toIso8601String(),
            'status' => $this->status,
            'lastPaymentAt' => $this->last_payment_at?->toIso8601String(),
            'locked' => $this->isLocked(),
            'trialDaysLeft' => $this->trialDaysLeft(),
            // Resolvidos aqui (não no frontend) para o painel mostrar "2/2
            // usadas hoje" sem um pedido extra — ver PlanLimitService.
            'limits' => collect($features)
                ->mapWithKeys(fn ($f) => [$this->camel($f) => $limits->limit($this->restaurant, $f)]),
            'usage' => collect($features)
                ->mapWithKeys(fn ($f) => [$this->camel($f) => $limits->usage($this->restaurant, $f)]),
            'features' => [
                'packages' => $limits->allows($this->restaurant, 'packages'),
                'customers' => $limits->allows($this->restaurant, 'customers'),
                'stats' => $limits->allows($this->restaurant, 'stats'),
            ],
        ];
    }

    private function camel(string $snake): string
    {
        return lcfirst(str_replace('_', '', ucwords($snake, '_')));
    }
}
