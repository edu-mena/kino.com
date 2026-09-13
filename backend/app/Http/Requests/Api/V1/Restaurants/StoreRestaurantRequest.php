<?php

namespace App\Http\Requests\Api\V1\Restaurants;

use App\Models\Restaurant;
use Illuminate\Foundation\Http\FormRequest;

/** Só system_operator chega aqui (ver RestaurantPolicy::create) — sem
 * self-signup, isto normalmente é chamado pela ação de aprovar uma
 * PartnerApplication, não por um formulário público. */
class StoreRestaurantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Restaurant::class);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string'],
            'cuisine' => ['nullable', 'string', 'max:80'],
            'address' => ['nullable', 'string', 'max:255'],
            'neighborhood' => ['nullable', 'string', 'max:120'],
            'city' => ['nullable', 'string', 'max:120'],
            'lat' => ['nullable', 'numeric', 'between:-90,90'],
            'lng' => ['nullable', 'numeric', 'between:-180,180'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email'],
            'is_delivery_available' => ['sometimes', 'boolean'],
            'fulfillment_modes' => ['sometimes', 'array'],
            'fulfillment_modes.*' => ['in:delivery,takeaway,dinein'],
            'accepted_payment_methods' => ['sometimes', 'array'],
            'accepted_payment_methods.*' => ['exists:payment_methods,code'],
            'caution_modes_for_orders' => ['sometimes', 'array'],
            'caution_modes_for_orders.*' => ['in:delivery,takeaway,dinein'],
            'delivery_zones' => ['sometimes', 'array'],
            'delivery_fee' => ['sometimes', 'numeric', 'min:0'],
            'estimated_delivery_minutes' => ['nullable', 'integer', 'min:0'],
            'caution_amount' => ['sometimes', 'numeric', 'min:0'],
            'caution_policy_notice' => ['nullable', 'string'],
            'accepts_reservations' => ['sometimes', 'boolean'],
            'reservation_slot_minutes' => ['sometimes', 'integer', 'min:15'],
        ];
    }
}
