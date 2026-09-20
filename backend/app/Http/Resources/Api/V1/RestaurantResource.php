<?php

namespace App\Http\Resources\Api\V1;

use App\Models\Restaurant;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Restaurant */
class RestaurantResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->uuid,
            'name' => $this->name,
            'description' => $this->description,
            'cuisine' => $this->cuisine,
            'priceLevel' => $this->price_level,
            'rating' => $this->rating === null ? null : (float) $this->rating,
            'reviewCount' => $this->review_count,
            'address' => $this->address,
            'neighborhood' => $this->neighborhood,
            'city' => $this->city,
            'lat' => $this->lat === null ? null : (float) $this->lat,
            'lng' => $this->lng === null ? null : (float) $this->lng,
            'phone' => $this->phone,
            'email' => $this->email,
            'coverImageUrl' => $this->cover_image_url,
            'wallpaperUrl' => $this->wallpaper_url,
            'galleryImages' => $this->whenLoaded('galleryImages', fn () => $this->galleryImages->map(fn ($g) => [
                'id' => $g->id,
                'url' => $g->url,
            ])),
            'isDeliveryAvailable' => $this->is_delivery_available,
            'fulfillmentModes' => $this->fulfillment_modes ?? [],
            'acceptedPaymentMethods' => $this->accepted_payment_methods ?? [],
            'cautionModesForOrders' => $this->caution_modes_for_orders ?? [],
            'deliveryZones' => $this->delivery_zones ?? [],
            'deliveryFee' => (float) $this->delivery_fee,
            'estimatedDeliveryMinutes' => $this->estimated_delivery_minutes,
            'cautionAmount' => (float) $this->caution_amount,
            'cautionPolicyNotice' => $this->caution_policy_notice,
            'isFeatured' => $this->is_featured,
            'acceptsReservations' => $this->accepts_reservations,
            'reservationSlotMinutes' => $this->reservation_slot_minutes,
            'ordersPausedManually' => $this->orders_paused_manually,
            'hours' => $this->whenLoaded('hours', fn () => $this->hours->map(fn ($h) => [
                'weekday' => $h->weekday,
                'isOpen' => $h->is_open,
                'ranges' => $h->relationLoaded('ranges') ? $h->ranges->map(fn ($r) => [
                    'start' => $r->start_time,
                    'end' => $r->end_time,
                ]) : [],
            ])),
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }
}
