<?php

namespace App\Services\Status;

use App\Mail\StatusIncidentMail;
use App\Models\Order;
use App\Models\Reservation;
use App\Models\StatusIncident;
use App\Models\StatusSubscriber;
use App\Models\User;
use App\Services\PushNotificationService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * Avisa os UTILIZADORES do início/fim de um incidente:
 *
 * - push a quem tem notificações ligadas (app e browser);
 * - email só a quem se inscreveu em /estado (confirmado) ou tem um pedido/
 *   reserva em curso — nunca à base toda (spam, e o servidor de email
 *   seria marcado como tal);
 * - a faixa no topo da app/site sai sozinha da API pública (`/status`).
 *
 * Tudo síncrono e sem fila de propósito: quem chama é o StatusMonitor,
 * precisamente quando a fila pode ser o serviço em baixo.
 */
class IncidentNotifier
{
    /** Estados de pedido/reserva "em curso" — quem os tem precisa de saber. */
    private const ACTIVE_ORDER_STATUSES = ['pending', 'accepted', 'ready', 'on_the_way'];

    private const ACTIVE_RESERVATION_STATUSES = ['pending', 'confirmed'];

    public function __construct(private readonly PushNotificationService $push) {}

    /** @param 'started'|'resolved' $phase */
    public function notify(StatusIncident $incident, string $phase): void
    {
        $message = $phase === 'started'
            ? IncidentMessages::started()
            : IncidentMessages::resolved($incident);

        $this->sendPush($message['title'], $message['body']);
        $this->sendEmails($message['title'], $message['body']);
    }

    private function sendPush(string $title, string $body): void
    {
        User::query()
            ->whereHas('deviceTokens')
            ->whereDoesntHave('preferences', fn ($q) => $q->where('notifications_enabled', false))
            ->chunkById(200, function ($users) use ($title, $body) {
                foreach ($users as $user) {
                    $this->push->sendMessage($user, $title, $body, '/estado', 'system');
                }
            });
    }

    private function sendEmails(string $title, string $body): void
    {
        $subscribers = StatusSubscriber::query()->confirmed()->get();
        foreach ($subscribers as $subscriber) {
            $this->mail($subscriber->email, new StatusIncidentMail($title, $body, $subscriber->unsubscribeUrl()));
        }

        $alreadySent = $subscribers->pluck('email')->map(fn ($e) => mb_strtolower($e))->all();
        foreach ($this->affectedEmails() as $email) {
            if (! in_array($email, $alreadySent, true)) {
                $this->mail($email, new StatusIncidentMail($title, $body));
            }
        }
    }

    /** Emails de quem tem um pedido (últimas 24h) ou reserva (hoje/amanhã)
     * em curso — conta ou convidado.
     *
     * @return list<string> */
    private function affectedEmails(): array
    {
        $orders = Order::query()
            ->whereIn('status', self::ACTIVE_ORDER_STATUSES)
            ->where('created_at', '>=', now()->subDay())
            ->with('user:id,email')
            ->get(['id', 'user_id', 'customer_email']);

        $reservations = Reservation::query()
            ->whereIn('status', self::ACTIVE_RESERVATION_STATUSES)
            ->whereBetween('date', [today()->toDateString(), today()->addDay()->toDateString()])
            ->with('user:id,email')
            ->get(['id', 'user_id', 'customer_email']);

        return $orders->concat($reservations)
            ->map(fn ($r) => $r->user?->email ?: $r->customer_email)
            ->filter(fn ($email) => is_string($email) && filter_var($email, FILTER_VALIDATE_EMAIL))
            ->map(fn ($email) => mb_strtolower($email))
            ->unique()
            ->values()
            ->all();
    }

    private function mail(string $to, StatusIncidentMail $mail): void
    {
        try {
            Mail::to($to)->send($mail);
        } catch (Throwable $e) {
            Log::warning('status: email de incidente falhou', ['to' => $to, 'error' => $e->getMessage()]);
        }
    }
}
