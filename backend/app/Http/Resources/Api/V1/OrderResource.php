<?php

namespace App\Http\Resources\Api\V1;

use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Order */
class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->uuid,
            'restaurantId' => $this->whenLoaded('restaurant', fn () => $this->restaurant->uuid),
            // Só presentes quando `restaurant` foi carregado (ver
            // OrderController::mine) — a lista "meus pedidos" do cliente
            // atravessa vários restaurantes, precisa de mostrar
            // nome/imagem sem um pedido à parte por pedido.
            'restaurantName' => $this->whenLoaded('restaurant', fn () => $this->restaurant->name),
            'restaurantImage' => $this->whenLoaded('restaurant', fn () => $this->restaurant->cover_image_url),
            // guestToken propositadamente FORA daqui — só é devolvido uma
            // vez, na resposta de criação (ver OrderController::store),
            // nunca em GETs subsequentes. O convidado guarda-o localmente;
            // não há razão para o servidor voltar a expor a credencial em
            // toda leitura (incl. para staff, que não precisa dela).
            'fulfillmentType' => $this->fulfillment_type,
            'customerName' => $this->customer_name,
            'customerPhone' => $this->customer_phone,
            'customerEmail' => $this->customer_email,
            'deliveryAddress' => $this->delivery_address_snapshot,
            'pickupAsap' => $this->pickup_asap,
            'pickupAt' => $this->pickup_at?->toIso8601String(),
            'partySize' => $this->party_size,
            'status' => $this->status,
            'estimatedMinutes' => $this->estimated_minutes,
            'deliveredAt' => $this->delivered_at?->toIso8601String(),
            'paymentMethod' => $this->payment_method_code,
            'cautionRequired' => $this->caution_required === null ? null : (float) $this->caution_required,
            'note' => $this->note,
            'promoCode' => $this->promo_code,
            'promoLabel' => $this->promo_label,
            'promoPercentOff' => $this->promo_percent_off,
            'promoFreeDelivery' => $this->promo_free_delivery,
            'paymentProofUrl' => $this->payment_proof_url,
            'paymentProofAt' => $this->payment_proof_at?->toIso8601String(),
            'invoiceUrl' => $this->invoice_url,
            'invoiceType' => $this->invoice_type,
            'invoiceAt' => $this->invoice_at?->toIso8601String(),
            // Só quando `courier` foi carregado (ver OrderController::show/
            // mine) — nome/telefone/veículo do estafeta a caminho, visível
            // ao cliente enquanto o pedido está "on_the_way".
            'courier' => $this->whenLoaded('courier', fn () => $this->courier ? [
                'name' => $this->courier->name,
                'phone' => $this->courier->phone,
                'vehicle' => $this->courier->vehicle,
            ] : null),
            'subtotal' => (float) $this->subtotal,
            'deliveryFee' => (float) $this->delivery_fee,
            'total' => (float) $this->total,
            'lines' => $this->whenLoaded('lines', fn () => $this->lines->map(fn ($l) => [
                'menuItemId' => $l->menuItem?->uuid,
                'name' => $l->item_name_snapshot,
                'unitPrice' => (float) $l->unit_price_snapshot,
                'qty' => $l->qty,
                'ingredients' => $l->line_ingredients ?? [],
                'lineTotal' => (float) $l->line_total,
            ])),
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }
}
