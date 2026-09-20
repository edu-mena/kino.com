<?php

namespace App\Jobs;

use App\Models\Notification;
use App\Models\User;
use App\Services\PushNotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Envia UMA `Notification` já persistida como Web Push a UM utilizador — o
 * request HTTP que a criou (Order/ReservationObserver) nunca espera pela
 * chamada de rede ao serviço de push de cada browser. Um job por
 * (utilizador, notificação) — várias notificações da mesma ação (cliente +
 * cada membro da equipa do restaurante) despacham vários jobs, nunca um só
 * a fazer fan-out sozinho.
 */
class SendPushNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;

    public int $timeout = 30;

    public function __construct(
        public readonly User $user,
        public readonly Notification $notification,
    ) {}

    public function handle(PushNotificationService $pushNotifications): void
    {
        $pushNotifications->sendForNotification($this->user, $this->notification);
    }
}
