<?php

namespace App\Events;

use App\Http\Resources\Api\V1\NotificationResource;
use App\Models\Notification;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Transmite uma `Notification` recém-criada — ver Fase N3 do plano de
 * notificações. Nunca enfileirado (`ShouldBroadcastNow`, não
 * `ShouldBroadcast`): o payload é pequeno e o valor todo disto é a latência
 * ser mínima — um hop de fila extra tornaria "tempo real" outra vez "quase
 * tempo real". Disparado por `NotificationObserver::created()`, nunca
 * chamado diretamente pelos sítios que criam notificações (Order/
 * ReservationObserver, NotifyFollowersJob, ProfileViewController) — assim
 * nenhum ponto de criação futuro pode esquecer de transmitir.
 */
class NotificationCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    public function __construct(public Notification $notification) {}

    /** @return array<int, PrivateChannel> */
    public function broadcastOn(): array
    {
        // Nunca as duas ao mesmo tempo (ver Order/ReservationObserver::notify
        // — cada Notification pertence OU ao cliente OU ao restaurante). O
        // canal usa o UUID público (ver routes/channels.php) — nunca a PK
        // interna, que o frontend não conhece de si próprio.
        return [
            $this->notification->user_id !== null
                ? new PrivateChannel("App.Models.User.{$this->notification->user->uuid}")
                : new PrivateChannel("App.Models.Restaurant.{$this->notification->restaurant->uuid}"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'notification.created';
    }

    /** Mesmo shape que a API já devolve — o frontend usa isto tanto para
     * invalidar as queries certas (pedidos/reservas/notificações, por
     * `kind`) como para atualizar o sino de imediato, sem esperar um
     * refetch. @return array<string, mixed> */
    public function broadcastWith(): array
    {
        return (new NotificationResource($this->notification))->resolve();
    }
}
