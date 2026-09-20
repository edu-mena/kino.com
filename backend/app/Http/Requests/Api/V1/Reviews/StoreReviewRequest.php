<?php

namespace App\Http\Requests\Api\V1\Reviews;

use App\Models\Order;
use App\Models\Reservation;
use App\Models\Restaurant;
use App\Models\Review;
use Illuminate\Contracts\Validation\Validator as ValidatorContract;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Sempre autenticado — decisão deliberada face ao mock (que deixava
 * convidado/"Cliente Luku" avaliar sem conta nenhuma): reviews públicas sem
 * dono nenhum são um vetor de spam óbvio que só faz sentido numa demo sem
 * backend. `ref_type`/`ref_id`, quando presentes, são validados a sério —
 * o mock só marcava uma string "order:123" como "já avaliado" sem
 * confirmar que o pedido é mesmo do cliente, deste restaurante, e já
 * concluído.
 */
class StoreReviewRequest extends FormRequest
{
    /**
     * ID interno (não o uuid público que o cliente envia em `ref_id`),
     * resolvido em withValidator() abaixo. Propriedade pública em vez de
     * `$this->merge()` + `validated()` de propósito: merge() muda o input
     * da request, mas o snapshot que `validated()` devolve já tinha sido
     * capturado antes do `after()` correr — um valor juntado ali nunca
     * aparecia em `validated()` (bug real, apanhado a correr os testes:
     * ref_id gravava sempre null, e por isso a verificação de "já avaliado"
     * nunca disparava).
     */
    public ?int $resolvedRefId = null;

    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'comment' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'tags' => ['sometimes', 'array'],
            'tags.*' => ['string', 'max:40'],
            'ref_type' => ['sometimes', 'nullable', Rule::in(['order', 'reservation']), 'required_with:ref_id'],
            'ref_id' => ['sometimes', 'nullable', 'string', 'required_with:ref_type'],
        ];
    }

    public function withValidator(ValidatorContract $validator): void
    {
        $validator->after(function (ValidatorContract $validator) {
            $refType = $this->input('ref_type');
            $refPublicId = $this->input('ref_id');
            if (! $refType || ! $refPublicId) {
                return;
            }

            /** @var Restaurant $restaurant */
            $restaurant = $this->route('restaurant');

            if ($refType === 'order') {
                $this->validateOrderRef($validator, $restaurant, $refPublicId);
            } else {
                $this->validateReservationRef($validator, $restaurant, $refPublicId);
            }
        });
    }

    private function validateOrderRef(ValidatorContract $validator, $restaurant, string $refPublicId): void
    {
        $order = Order::query()->where('uuid', $refPublicId)->first();

        if (! $order || $order->user_id !== $this->user()->id || $order->restaurant_id !== $restaurant->id) {
            $validator->errors()->add('ref_id', 'Pedido inválido para avaliar.');

            return;
        }

        if (! in_array($order->status, ['delivered', 'completed'], true)) {
            $validator->errors()->add('ref_id', 'Só é possível avaliar depois de o pedido estar concluído.');

            return;
        }

        if (Review::query()->where('ref_type', 'order')->where('ref_id', $order->id)->exists()) {
            $validator->errors()->add('ref_id', 'Este pedido já foi avaliado.');

            return;
        }

        $this->resolvedRefId = $order->id;
    }

    private function validateReservationRef(ValidatorContract $validator, $restaurant, string $refPublicId): void
    {
        $reservation = Reservation::query()->where('uuid', $refPublicId)->first();

        if (! $reservation || $reservation->user_id !== $this->user()->id || $reservation->restaurant_id !== $restaurant->id) {
            $validator->errors()->add('ref_id', 'Reserva inválida para avaliar.');

            return;
        }

        if ($reservation->status !== 'confirmed' || $reservation->date->isFuture()) {
            $validator->errors()->add('ref_id', 'Só é possível avaliar depois da reserva confirmada já ter passado.');

            return;
        }

        if (Review::query()->where('ref_type', 'reservation')->where('ref_id', $reservation->id)->exists()) {
            $validator->errors()->add('ref_id', 'Esta reserva já foi avaliada.');

            return;
        }

        $this->resolvedRefId = $reservation->id;
    }
}
