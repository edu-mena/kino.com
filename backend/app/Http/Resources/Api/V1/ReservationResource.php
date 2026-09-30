<?php

namespace App\Http\Resources\Api\V1;

use App\Models\Reservation;
use App\Services\MediaUploadService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Reservation */
class ReservationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        // Comprovativo/fatura: URL assinado de curta duração (bucket privado —
        // ver MediaUploadService::documentUrl), nunca um link permanente.
        return [
            'id' => $this->uuid,
            'restaurantId' => $this->whenLoaded('restaurant', fn () => $this->restaurant->uuid),
            // Só presentes quando `restaurant` foi carregado (ver
            // ReservationController::mine) — a lista "minhas reservas" do
            // cliente atravessa vários restaurantes, precisa de mostrar
            // nome/imagem sem um pedido à parte por reserva.
            'restaurantName' => $this->whenLoaded('restaurant', fn () => $this->restaurant->name),
            'restaurantImage' => $this->whenLoaded('restaurant', fn () => $this->restaurant->cover_image_url),
            'customerName' => $this->customer_name,
            'customerPhone' => $this->customer_phone,
            'customerEmail' => $this->customer_email,
            'date' => $this->date?->toDateString(),
            'time' => is_string($this->time) ? substr($this->time, 0, 5) : $this->time,
            'peopleCount' => $this->people_count,
            'reservationKind' => $this->reservation_kind,
            // Só presente numa reserva de pacote (Fase L3c) — `title`
            // nulo usa o nome do tipo, decisão que fica ao frontend (ver
            // RestaurantPackageResource, mesma regra).
            'package' => $this->whenLoaded('restaurantPackage', fn () => $this->restaurantPackage ? [
                'id' => $this->restaurantPackage->uuid,
                'title' => $this->restaurantPackage->title,
                'packageTypeName' => $this->restaurantPackage->packageType->name,
                'price' => (float) $this->restaurantPackage->price,
            ] : null),
            'cautionAmount' => (float) $this->caution_amount,
            'cautionStatus' => $this->caution_status,
            'status' => $this->status,
            'statusUpdatedAt' => $this->status_updated_at?->toIso8601String(),
            'tableId' => $this->whenLoaded('table', fn () => $this->table?->uuid),
            'specialRequests' => $this->special_requests,
            'paymentProofUrl' => app(MediaUploadService::class)->documentUrl($this->payment_proof_url),
            'paymentProofAt' => $this->payment_proof_at?->toIso8601String(),
            'invoiceUrl' => app(MediaUploadService::class)->documentUrl($this->invoice_url),
            'invoiceAt' => $this->invoice_at?->toIso8601String(),
            'promoCode' => $this->promo_code,
            'promoLabel' => $this->promo_label,
            'promoPercentOff' => $this->promo_percent_off,
            // Só presente quando o controller anexa (GET staff — ver
            // ReservationOccupancyService): sinal de sobreposição de mesa/
            // lotação na janela desta reserva, nunca bloqueia a criação.
            'occupancy' => $this->when(isset($this->occupancy), fn () => $this->occupancy),
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }
}
