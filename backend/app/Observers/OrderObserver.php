<?php

namespace App\Observers;

use App\Jobs\SendPushNotificationJob;
use App\Models\Courier;
use App\Models\Notification;
use App\Models\Order;
use Illuminate\Contracts\Events\ShouldHandleEventsAfterCommit;

/**
 * Substitui o diffing client-side do mock (`src/lib/notifications.tsx`) por
 * geração real no evento — cria SEMPRE uma notificação para o restaurante
 * (event orderNew/orderStatus) e, se o pedido for de conta autenticada
 * (não convidado), também uma para o cliente. Convidados não têm sessão
 * para consultar um feed de notificações — continuam a ver o estado
 * diretamente via GET /orders/{id} com o guest_token.
 *
 * `ShouldHandleEventsAfterCommit`: `OrderController::store()` cria o pedido
 * e SÓ DEPOIS as linhas (`$order->lines()->create(...)`), tudo dentro da
 * mesma transação — sem isto, `created()` corria no INSERT do pedido, antes
 * de existir uma única linha, e o snapshot da notificação (itemCount/total)
 * saía sempre a zero. Adiar para depois do commit não muda nada no caminho
 * de `updated()` (mudança de estado nunca está dentro de uma transação que
 * ainda vai inserir mais linhas).
 */
class OrderObserver implements ShouldHandleEventsAfterCommit
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
        if ($order->isDirty('status')) {
            $this->notify($order, 'orderStatus');

            if (in_array($order->status, self::TERMINAL_STATUSES, true)) {
                $this->releaseCourier($order);
            }
        }

        // Comprovativo/fatura não mudam `status` — sem isto, nenhum dos
        // dois lados sabia que algo tinha sido enviado a não ser voltando a
        // abrir o pedido manualmente (ver pedido do utilizador: "mais
        // atenção" a estas duas ações). Só o lado a quem a ação diz
        // respeito é notificado: comprovativo é o CLIENTE a avisar o
        // restaurante (não faz sentido notificá-lo do que ele próprio fez);
        // fatura é o INVERSO.
        if ($order->isDirty('payment_proof_url') && $order->payment_proof_url !== null) {
            $this->notify($order, 'orderPaymentProof', onlyFor: ['restaurant']);
        }
        if ($order->isDirty('invoice_url') && $order->invoice_url !== null) {
            $this->notify($order, 'orderInvoice', onlyFor: ['customer']);
        }
    }

    /** @param array<int, 'restaurant'|'customer'> $onlyFor */
    private function notify(Order $order, string $event, array $onlyFor = ['restaurant', 'customer']): void
    {
        $snapshot = $this->snapshotFor($order);

        if (in_array('restaurant', $onlyFor, true)) {
            $restaurantNotification = Notification::query()->create([
                'restaurant_id' => $order->restaurant_id,
                'kind' => 'order',
                'ref_id' => $order->id,
                'event' => $event,
                'status_snapshot' => $snapshot,
            ]);

            // Push para toda a equipa do restaurante — mais do que um membro
            // pode ter o telemóvel/browser com a subscrição ativa (ver
            // PushNotificationService, é um no-op silencioso para quem não
            // tem nenhuma subscrição guardada).
            foreach ($order->restaurant->staff as $staffUser) {
                SendPushNotificationJob::dispatch($staffUser, $restaurantNotification);
            }
        }

        if (in_array('customer', $onlyFor, true) && $order->user_id) {
            $customerNotification = Notification::query()->create([
                'user_id' => $order->user_id,
                'kind' => 'order',
                'ref_id' => $order->id,
                'event' => $event,
                'status_snapshot' => $snapshot,
            ]);

            SendPushNotificationJob::dispatch($order->user, $customerNotification);
        }
    }

    /** JSON compacto com o suficiente para o texto da notificação deixar de
     * ser genérico ("Novo pedido em X") sem precisar de recarregar o pedido
     * inteiro em nenhum sítio que só mostra o sino/lista. */
    private function snapshotFor(Order $order): string
    {
        return json_encode([
            'status' => $order->status,
            'itemCount' => $order->lines()->count(),
            'total' => (float) $order->total,
        ], JSON_THROW_ON_ERROR);
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
