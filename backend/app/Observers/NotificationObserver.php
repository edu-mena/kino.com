<?php

namespace App\Observers;

use App\Events\NotificationCreated;
use App\Models\Notification;
use Illuminate\Contracts\Events\ShouldHandleEventsAfterCommit;

/**
 * Transmite toda `Notification` criada, seja qual for a origem (Order/
 * ReservationObserver, NotifyFollowersJob, ProfileViewController) — um único
 * sítio, nunca um `NotificationCreated::dispatch()` espalhado por cada
 * ponto de criação (que um ponto novo poderia esquecer). `ShouldHandleEventsAfterCommit`:
 * mesma razão de `OrderObserver` — algumas notificações nascem dentro de
 * transações maiores (ver `ReservationController::store`), e transmitir
 * antes do commit arriscaria anunciar um registo que a transação ainda
 * podia reverter.
 */
class NotificationObserver implements ShouldHandleEventsAfterCommit
{
    public function created(Notification $notification): void
    {
        NotificationCreated::dispatch($notification);
    }
}
