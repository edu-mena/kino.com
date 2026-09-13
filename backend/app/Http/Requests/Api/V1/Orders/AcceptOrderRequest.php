<?php

namespace App\Http\Requests\Api\V1\Orders;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Restaurante aceita o pedido: fixa o método de pagamento exigido — a
 * caução (se o modo estiver em caution_modes_for_orders) é calculada pelo
 * servidor, nunca enviada pelo cliente (ver OrderController::accept). */
class AcceptOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        $order = $this->route('order');

        return $this->user()->can('manageOperations', $order->restaurant) && $order->status === 'pending';
    }

    public function rules(): array
    {
        $order = $this->route('order');

        return [
            'payment_method_code' => [
                'required', 'string',
                Rule::in($order->restaurant->accepted_payment_methods ?? []),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'payment_method_code.in' => 'Este restaurante não aceita esse método de pagamento.',
        ];
    }
}
