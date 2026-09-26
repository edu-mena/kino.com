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

        // Ver OrderObserver::updated — mesmo raciocínio: comprovativo/fatura
        // não mudam `status`, e só o lado a quem a ação diz respeito é
        // notificado.
        if ($reservation->isDirty('payment_proof_url') && $reservation->payment_proof_url !== null) {
            $this->notify($reservation, 'reservationPaymentProof', onlyFor: ['restaurant']);
        }
        if ($reservation->isDirty('invoice_url') && $reservation->invoice_url !== null) {
            $this->notify($reservation, 'reservationInvoice', onlyFor: ['customer']);
        }
    }

    /** @param array<int, 'restaurant'|'customer'> $onlyFor */
    private function notify(Reservation $reservation, string $event, array $onlyFor = ['restaurant', 'customer']): void
    {
        $snapshot = $this->snapshotFor($reservation);

        if (in_array('restaurant', $onlyFor, true)) {
            $restaurantNotification = Notification::query()->create([
                'restaurant_id' => $reservation->restaurant_id,
                'kind' => 'reservation',
                'ref_id' => $reservation->id,
                'event' => $event,
                'status_snapshot' => $snapshot,
            ]);

            foreach ($reservation->restaurant->staff as $staffUser) {
                SendPushNotificationJob::dispatch($staffUser, $restaurantNotification);
            }
        }

        if (in_array('customer', $onlyFor, true) && $reservation->user_id) {
            $customerNotification = Notification::query()->create([
                'user_id' => $reservation->user_id,
                'kind' => 'reservation',
                'ref_id' => $reservation->id,
                'event' => $event,
                'status_snapshot' => $snapshot,
            ]);

            SendPushNotificationJob::dispatch($reservation->user, $customerNotification);
        }
    }

    /** Ver OrderObserver::snapshotFor — mesmo raciocínio, para reservas. */
    private function snapshotFor(Reservation $reservation): string
    {
        return json_encode([
            'status' => $reservation->status,
            'peopleCount' => $reservation->people_count,
            'date' => $reservation->date?->toDateString(),
            'time' => $reservation->time,
        ], JSON_THROW_ON_ERROR);
    }
}
