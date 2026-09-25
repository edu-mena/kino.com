<?php

namespace App\Jobs;

use App\Models\Notification;
use App\Models\Restaurant;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;

/**
 * Fan-out de uma atualização do restaurante para os seguidores com o sino
 * ligado — em blocos, nunca todos em memória. Cada seguidor recebe uma
 * `Notification` própria (kind=restaurant, ref=restaurante) e um push
 * (SendPushNotificationJob, um por utilizador, como em pedidos/reservas).
 */
class NotifyFollowersJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable;

    public const CHUNK = 500;

    public int $tries = 2;

    public function __construct(
        public readonly int $restaurantId,
        public readonly string $event,
        public readonly string $snapshot = '',
    ) {}

    public function handle(): void
    {
        $restaurant = Restaurant::query()->find($this->restaurantId);
        if (! $restaurant) {
            return;
        }

        $restaurant->followers()
            ->wherePivot('notify', true)
            ->chunkById(self::CHUNK, function ($followers) use ($restaurant) {
                foreach ($followers as $follower) {
                    $notification = Notification::query()->create([
                        'user_id' => $follower->id,
                        'kind' => 'restaurant',
                        'ref_id' => $restaurant->id,
                        'event' => $this->event,
                        'status_snapshot' => $this->snapshot,
                    ]);

                    SendPushNotificationJob::dispatch($follower, $notification);
                }
            }, 'users.id', 'id');
    }
}
