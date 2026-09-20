<?php

namespace App\Http\Requests\Api\V1\Restaurants;

use Illuminate\Foundation\Http\FormRequest;

/** Só owner (não manager/staff) — ver RestaurantPolicy::managePaymentDetails. */
class UpdateRestaurantPaymentDetailsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('managePaymentDetails', $this->route('restaurant'));
    }

    public function rules(): array
    {
        return [
            'details' => ['required', 'array', 'min:1'],
            'details.*.payment_method_code' => ['required', 'string', 'exists:payment_methods,code'],
            'details.*.details' => ['required', 'string', 'max:500'],
        ];
    }
}
