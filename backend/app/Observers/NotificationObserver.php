<?php

namespace App\Observers;

use App\Events\NotificationCreated;
use App\Models\Notification;
use Illuminate\Contracts\Events\ShouldHandleEventsAfterCommit;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Transmite toda `Notification` criada, seja qual for a origem (Order/
 * ReservationObserver, NotifyFollowersJob, ProfileViewController) — um único
 * sítio, nunca um `NotificationCreated::dispatch()` espalhado por cada
 * ponto de criação (que um ponto novo poderia esquecer). `ShouldHandleEventsAfterCommit`:
 * mesma razão de `OrderObserver` — algumas notificações nascem dentro de
 * transações maiores (ver `ReservationController::store`), e transmitir
 * antes do commit arriscaria anunciar um registo que a transação ainda
 * podia reverter.
 *
 * `try/catch`: `NotificationCreated` é `ShouldBroadcastNow` — corre já
 * dentro do próprio pedido HTTP que criou a notificação (aceitar um
 * pedido/reserva), não numa fila à parte. Se o Reverb estiver
 * inalcançável/mal configurado nesse momento, a transmissão falhava e
 * derrubava o pedido/reserva em si com um 500 — a mesma disciplina já
 * aplicada em `PushNotificationService` ("nunca falha o request/job que o
 * chamou") tinha de valer aqui também.
 */
class NotificationObserver implements ShouldHandleEventsAfterCommit
{
    public function created(Notification $notification): void
    {
        try {
            NotificationCreated::dispatch($notification);
        } catch (Throwable $e) {
            Log::warning('notification-broadcast: falhou', [
                'notification_id' => $notification->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
