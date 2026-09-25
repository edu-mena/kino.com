<?php

namespace App\Http\Requests\Api\V1\Restaurants;

use Illuminate\Foundation\Http\FormRequest;

class UpdateRestaurantRequest extends FormRequest
{
    /** Campos de política de negócio (dinheiro/comercial) — decisão
     * confirmada com o utilizador em revisão cruzada: só o owner mexe
     * nisto, manager/staff podem continuar a editar o resto (nome,
     * morada, horários, etc). Ver RestaurantPolicy::manageBusinessPolicy. */
    private const BUSINESS_POLICY_FIELDS = [
        'fulfillment_modes', 'accepted_payment_methods',
        'caution_modes_for_orders', 'caution_amount', 'buffet_price',
    ];

    public function authorize(): bool
    {
        $restaurant = $this->route('restaurant');

        if (! $this->user()->can('update', $restaurant)) {
            return false;
        }

        if ($this->touchesBusinessPolicyFields() && ! $this->user()->can('manageBusinessPolicy', $restaurant)) {
            return false;
        }

        return true;
    }

    private function touchesBusinessPolicyFields(): bool
    {
        return count(array_intersect(self::BUSINESS_POLICY_FIELDS, array_keys($this->input()))) > 0;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:150'],
            'description' => ['sometimes', 'nullable', 'string'],
            'cuisine' => ['sometimes', 'nullable', 'string', 'max:80'],
            'address' => ['sometimes', 'nullable', 'string', 'max:255'],
            'neighborhood' => ['sometimes', 'nullable', 'string', 'max:120'],
            'city' => ['sometimes', 'nullable', 'string', 'max:120'],
            'lat' => ['sometimes', 'nullable', 'numeric', 'between:-90,90'],
            'lng' => ['sometimes', 'nullable', 'numeric', 'between:-180,180'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:30'],
            'email' => ['sometimes', 'nullable', 'email'],
            'cover_image_url' => ['sometimes', 'nullable', 'string', 'max:2048'],
            'wallpaper_url' => ['sometimes', 'nullable', 'string', 'max:2048'],
            'is_delivery_available' => ['sometimes', 'boolean'],
            'fulfillment_modes' => ['sometimes', 'array'],
            'fulfillment_modes.*' => ['in:delivery,takeaway,dinein'],
            'accepted_payment_methods' => ['sometimes', 'array'],
            'accepted_payment_methods.*' => ['exists:payment_methods,code'],
            'caution_modes_for_orders' => ['sometimes', 'array'],
            'caution_modes_for_orders.*' => ['in:delivery,takeaway,dinein'],
            'delivery_zones' => ['sometimes', 'array'],
            'delivery_fee' => ['sometimes', 'numeric', 'min:0'],
            'estimated_delivery_minutes' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'caution_amount' => ['sometimes', 'numeric', 'min:0'],
            'caution_policy_notice' => ['sometimes', 'nullable', 'string'],
            'accepts_reservations' => ['sometimes', 'boolean'],
            'reservation_slot_minutes' => ['sometimes', 'integer', 'min:15'],
            // `0` desliga o cancelamento pós-confirmação de propósito (ver
            // ReservationController::cancel) — por isso `min:0`, não `min:15`
            // como o slot acima.
            'reservation_cancellation_window_minutes' => ['sometimes', 'integer', 'min:0'],
            'orders_paused_manually' => ['sometimes', 'boolean'],
            'buffet_price' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'buffet_hours_notice' => ['sometimes', 'nullable', 'string', 'max:255'],
            'buffet_table_time_limit_minutes' => ['sometimes', 'nullable', 'integer', 'min:1'],
        ];
    }
}
