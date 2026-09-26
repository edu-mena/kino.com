<?php

namespace App\Http\Resources\Api\V1;

use App\Models\Notification;
use App\Models\Order;
use App\Models\Reservation;
use App\Models\Restaurant;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Notification */
class NotificationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->uuid,
            'kind' => $this->kind,
            'refId' => $this->refId(),
            // Aviso a seguidor (kind=restaurant): o restaurante é o próprio ref.
            'restaurantId' => $this->kind === 'restaurant'
                ? $this->refId()
                : $this->whenLoaded('restaurant', fn () => $this->restaurant?->uuid),
            'event' => $this->event,
            'status' => $this->statusValue(),
            // Contexto extra (itens/total do pedido, pessoas/hora da reserva)
            // para o texto deixar de ser genérico — `null` em notificações
            // antigas ou de seguidor, que nunca tiveram isto (ver
            // `Notification::snapshot()`).
            'snapshot' => $this->snapshot(),
            'readAt' => $this->read_at?->toIso8601String(),
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }

    /** `ref_id` interno nunca sai cru — resolve pro uuid público do
     * order/reservation correspondente. 1 query por notificação (N+1
     * aceitável para uma lista de 20-50 no sino; se crescer, otimizar com
     * um preload em lote por kind no controller). */
    private function refId(): ?string
    {
        $model = match ($this->kind) {
            'order' => Order::query()->find($this->ref_id),
            'restaurant' => Restaurant::query()->find($this->ref_id),
            default => Reservation::query()->find($this->ref_id),
        };

        return $model?->uuid;
    }
}
