<?php

namespace App\Observers;

use App\Models\Courier;
use App\Models\Notification;
use App\Models\Order;

/**
 * Substitui o diffing client-side do mock (`src/lib/notifications.tsx`) por
 * geração real no evento — cria SEMPRE uma notificação para o restaurante
 * (event orderNew/orderStatus) e, se o pedido for de conta autenticada
 * (não convidado), também uma para o cliente. Convidados não têm sessão
 * para consultar um feed de notificações — continuam a ver o estado
 * diretamente via GET /orders/{id} com o guest_token.
 */
class OrderObserver
{
    /** Estados terminais — nunca mais o estafeta faz nada por este pedido
     * (ver mock, `releaseOrder` chamado ao entregar/recusar/cancelar). */
    private const TERMINAL_STATUSES = ['delivered', 'rejected', 'canceled', 'completed'];

    public function created(Order $order): void
    {
        $this->notify($order, 'orderNew');
    }

    public function updated(Order $order): void
    {
        if (! $order->isDirty('status')) {
            return;
        }

        $this->notify($order, 'orderStatus');

        if (in_array($order->status, self::TERMINAL_STATUSES, true)) {
            $this->releaseCourier($order);
        }
    }

    private function notify(Order $order, string $event): void
    {
        Notification::query()->create([
            'restaurant_id' => $order->restaurant_id,
            'kind' => 'order',
            'ref_id' => $order->id,
            'event' => $event,
            'status_snapshot' => $order->status,
        ]);

        if ($order->user_id) {
            Notification::query()->create([
                'user_id' => $order->user_id,
                'kind' => 'order',
                'ref_id' => $order->id,
                'event' => $event,
                'status_snapshot' => $order->status,
            ]);
        }
    }

    /** Liberta o estafeta atribuído (se houver) de volta pra "disponível" —
     * central aqui, não em cada endpoint que possa mudar o status do
     * pedido para um estado terminal. */
    private function releaseCourier(Order $order): void
    {
        Courier::query()
            ->where('active_order_id', $order->id)
            ->update(['status' => 'disponivel', 'active_order_id' => null]);
    }
}
