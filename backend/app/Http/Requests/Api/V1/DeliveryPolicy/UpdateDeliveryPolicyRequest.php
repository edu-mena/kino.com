<?php

namespace App\Http\Requests\Api\V1\DeliveryPolicy;

use Illuminate\Foundation\Http\FormRequest;

/** Política de entrega é da plataforma toda, não de um restaurante — só
 * system_operator mexe (ver plano, DeliveryFeeCalculator). */
class UpdateDeliveryPolicyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isSystemOperator();
    }

    public function rules(): array
    {
        return [
            'free_radius_km' => ['sometimes', 'numeric', 'min:0'],
            'per_km_surcharge_kz' => ['sometimes', 'numeric', 'min:0'],
        ];
    }
}
