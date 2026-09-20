<?php

namespace App\Http\Requests\Api\V1\Orders;

use App\Models\Order;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Transições válidas (mesma máquina de estados do mock —
 * src/lib/cart.tsx, `updateOrderStatus`):
 *   delivery:          accepted -> on_the_way -> delivered
 *   takeaway/dinein:    accepted -> ready -> completed
 *   pending -> rejected (recusa, ver AcceptOrderRequest para o caminho "aceitar")
 *
 * `accepted -> on_the_way` de propósito FORA daqui (ver mock,
 * admin.pedidos.tsx `dispatch()`) — só acontece atomicamente com atribuir
 * um estafeta, via OrderController::dispatch/DispatchOrderRequest. Sem
 * isto, dava pra despachar uma entrega sem estafeta nenhum por este
 * endpoint genérico.
 */
class UpdateOrderStatusRequest extends FormRequest
{
    private const TRANSITIONS = [
        'delivery' => ['pending' => ['rejected'], 'on_the_way' => ['delivered']],
        'takeaway' => ['pending' => ['rejected'], 'accepted' => ['ready'], 'ready' => ['completed']],
        'dinein' => ['pending' => ['rejected'], 'accepted' => ['ready'], 'ready' => ['completed']],
    ];

    public function authorize(): bool
    {
        $order = $this->route('order');

        return $this->user()->can('manageOperations', $order->restaurant);
    }

    public function rules(): array
    {
        /** @var Order $order */
        $order = $this->route('order');
        $allowed = self::TRANSITIONS[$order->fulfillment_type][$order->status] ?? [];

        return [
            'status' => ['required', Rule::in($allowed)],
        ];
    }

    public function messages(): array
    {
        return ['status.in' => 'Transição de estado inválida a partir do estado atual do pedido.'];
    }
}
