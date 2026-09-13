<?php

namespace App\Http\Requests\Api\V1\Orders;

use App\Models\Courier;
use App\Models\Order;
use Illuminate\Contracts\Validation\Validator as ValidatorContract;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * "Aceite" -> "A caminho": exige atribuir um estafeta LIVRE numa única ação
 * (ver mock, admin.pedidos.tsx `dispatch()` — assign() + updateOrderStatus()
 * sempre juntos, nunca dois passos separados). Só delivery; takeaway/dinein
 * vão de accepted->ready sem estafeta nenhum (ver UpdateOrderStatusRequest).
 */
class DispatchOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Order $order */
        $order = $this->route('order');

        return $this->user()->can('manageOperations', $order->restaurant);
    }

    public function rules(): array
    {
        /** @var Order $order */
        $order = $this->route('order');

        return [
            'courier_id' => [
                'required',
                Rule::exists('couriers', 'uuid')->where('restaurant_id', $order->restaurant_id),
            ],
        ];
    }

    public function withValidator(ValidatorContract $validator): void
    {
        $validator->after(function (ValidatorContract $validator) {
            /** @var Order $order */
            $order = $this->route('order');

            if ($order->fulfillment_type !== 'delivery' || $order->status !== 'accepted') {
                $validator->errors()->add('courier_id', 'Só é possível despachar um pedido de entrega já aceite.');

                return;
            }

            $courier = Courier::query()->where('uuid', $this->input('courier_id'))->first();
            if ($courier && $courier->status !== 'disponivel') {
                $validator->errors()->add('courier_id', 'Este estafeta não está disponível.');
            }
        });
    }
}
