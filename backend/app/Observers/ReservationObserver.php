<?php

namespace App\Observers;

use App\Jobs\SendPushNotificationJob;
use App\Models\Notification;
use App\Models\Reservation;

/** Ver OrderObserver — mesmo raciocínio, para reservas. */
class ReservationObserver
{
    public function created(Reservation $reservation): void
    {
        $this->notify($reservation, 'reservationNew');
    }

    public function updated(Reservation $reservation): void
    {
        if ($reservation->isDirty('status')) {
            $this->notify($reservation, 'reservationStatus');
        }
    }

    private function notify(Reservation $reservation, string $event): void
    {
        $restaurantNotification = Notification::query()->create([
            'restaurant_id' => $reservation->restaurant_id,
            'kind' => 'reservation',
            'ref_id' => $reservation->id,
            'event' => $event,
            'status_snapshot' => $reservation->status,
        ]);

        foreach ($reservation->restaurant->staff as $staffUser) {
            SendPushNotificationJob::dispatch($staffUser, $restaurantNotification);
        }

        if ($reservation->user_id) {
            $customerNotification = Notification::query()->create([
                'user_id' => $reservation->user_id,
                'kind' => 'reservation',
                'ref_id' => $reservation->id,
                'event' => $event,
                'status_snapshot' => $reservation->status,
            ]);

            SendPushNotificationJob::dispatch($reservation->user, $customerNotification);
        }
    }
}
