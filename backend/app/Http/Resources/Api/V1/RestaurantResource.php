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
            // Só isto da subscrição é público — nunca plano/valores/datas de
            // pagamento (billing é interno, ver SubscriptionController). O
            // cliente só precisa de saber se pode encomendar agora ou não.
            // NÃO usar whenLoaded() aqui: quando a relação está carregada
            // mas não há linha (HasOne sem subscrição), ele devolve `null`
            // sem sequer chamar a closure — teria de ser tratado à parte de
            // qualquer forma, então calcula-se direto.
            'isSuspended' => $this->relationLoaded('subscription')
                ? $this->subscription?->status === 'suspended'
                : false,
            'hours' => $this->whenLoaded('hours', fn () => $this->hours->map(fn ($h) => [
                'weekday' => $h->weekday,
                'isOpen' => $h->is_open,
                // `time` no Postgres devolve "HH:MM:SS" — corta pra "HH:MM"
                // (formato que o frontend manda e a validação de
                // atualização exige, `date_format:H:i`). Sem isto, guardar o
                // horário uma vez já bastava para nenhuma gravação seguinte
                // do perfil funcionar mais: o formulário reabastecia com
                // "HH:MM:SS" (ver seedFromRestaurant em admin.perfil.tsx),
                // reenviava esse valor no próximo "Guardar" (mesmo sem tocar
                // no horário) e a API recusava com 422 — bug real,
                // encontrado a testar o fluxo completo.
                'ranges' => $h->relationLoaded('ranges') ? $h->ranges->map(fn ($r) => [
                    'start' => substr((string) $r->start_time, 0, 5),
                    'end' => substr((string) $r->end_time, 0, 5),
                ]) : [],
            ])),
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }
}
