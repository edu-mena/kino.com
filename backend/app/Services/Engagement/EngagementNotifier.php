<?php

namespace App\Services\Engagement;

use App\Models\EngagementNotification;
use App\Models\Order;
use App\Models\Reservation;
use App\Models\Restaurant;
use App\Models\Review;
use App\Models\User;
use App\Services\PushNotificationService;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Notificações "à Duolingo": lembretes na hora certa e reconquista de quem
 * deixou de abrir a app — com humor, mas com regras rígidas para nunca
 * virarem spam:
 *
 * - só push (quem não ligou as notificações não recebe nada) e só para
 *   quem não desligou "Lembretes e novidades" nas preferências;
 * - cada lembrete sai no máximo uma vez (`engagement_notifications`, chave
 *   única utilizador+tipo+referência);
 * - os de "marketing" (sugestão de refeição, pedir avaliação, reconquista)
 *   no máximo 1 por dia e 3 por semana por pessoa, e nunca entre as 21:30 e
 *   as 08:00 (Luanda);
 * - o lembrete de reserva é serviço, não marketing: fica fora desses
 *   limites (mas respeita as preferências).
 */
class EngagementNotifier
{
    public const TIMEZONE = 'Africa/Luanda';

    private const MARKETING_KINDS = ['meal_suggestion', 'review_request', 'win_back'];

    private const MAX_MARKETING_PER_WEEK = 3;

    /** Dias sem abrir a app → escalão de reconquista. */
    private const WIN_BACK_TIERS = [30, 14, 7];

    private const FINISHED_ORDER_STATUSES = ['delivered', 'completed'];

    public function __construct(private readonly PushNotificationService $push) {}

    /** Perto do almoço/jantar: sugere o restaurante (e o prato) de sempre. */
    public function sendMealSuggestions(string $meal, ?CarbonImmutable $now = null): int
    {
        $now ??= CarbonImmutable::now();
        if (! $this->isMarketingHour($now)) {
            return 0;
        }
        $today = $now->timezone(self::TIMEZONE)->toDateString();
        $sent = 0;

        $this->eligibleUsers(marketing: true)
            ->whereHas('orders', fn ($q) => $q->whereIn('status', self::FINISHED_ORDER_STATUSES)->where('created_at', '>=', $now->subDays(60)))
            ->whereDoesntHave('orders', fn ($q) => $q->where('created_at', '>=', $now->timezone(self::TIMEZONE)->startOfDay()->utc()))
            ->chunkById(200, function ($users) use ($meal, $today, $now, &$sent) {
                foreach ($users as $user) {
                    $favorite = $this->favoriteFor($user);
                    if (! $favorite) {
                        continue;
                    }
                    [$title, $body] = MessageCatalog::meal($meal, $favorite['restaurant']->name, $favorite['dish'], $user->id);
                    $sent += (int) $this->deliver($user, 'meal_suggestion', "{$today}-{$meal}", $title, $body, "/restaurantes/{$favorite['restaurant']->uuid}", $now);
                }
            });

        return $sent;
    }

    /** Reservas confirmadas para daqui a ~2h (corre a cada 15 minutos). */
    public function sendReservationReminders(?CarbonImmutable $now = null): int
    {
        $now ??= CarbonImmutable::now();
        $local = $now->timezone(self::TIMEZONE);
        $from = $local->addMinutes(90);
        $to = $local->addMinutes(150);
        $sent = 0;

        $reservations = Reservation::query()
            ->where('status', 'confirmed')
            ->whereNotNull('user_id')
            ->whereDate('date', $local->toDateString())
            ->whereBetween('time', [$from->format('H:i:s'), $to->format('H:i:s')])
            ->with(['user', 'restaurant:id,name'])
            ->get();

        foreach ($reservations as $reservation) {
            $user = $reservation->user;
            if (! $user || ! $this->wantsNotifications($user, marketing: false)) {
                continue;
            }
            [$title, $body] = MessageCatalog::reservationReminder(
                $reservation->restaurant?->name ?? 'restaurante',
                substr((string) $reservation->time, 0, 5),
                $reservation->id,
            );
            $sent += (int) $this->deliver($user, 'reservation_reminder', (string) $reservation->id, $title, $body, '/reservas', $now);
        }

        return $sent;
    }

    /** 2 a 6 horas depois de um pedido entregue/concluído, sem avaliação. */
    public function sendReviewRequests(?CarbonImmutable $now = null): int
    {
        $now ??= CarbonImmutable::now();
        if (! $this->isMarketingHour($now)) {
            return 0;
        }
        $sent = 0;

        $orders = Order::query()
            ->whereIn('status', self::FINISHED_ORDER_STATUSES)
            ->whereNotNull('user_id')
            ->whereBetween('updated_at', [$now->subHours(6), $now->subHours(2)])
            ->with(['user', 'restaurant:id,name'])
            ->get();

        foreach ($orders as $order) {
            $user = $order->user;
            if (! $user || ! $this->wantsNotifications($user, marketing: true)) {
                continue;
            }
            $reviewed = Review::query()
                ->where('user_id', $user->id)
                ->where(fn ($q) => $q
                    ->where(fn ($q) => $q->where('ref_type', 'order')->where('ref_id', $order->id))
                    ->orWhere(fn ($q) => $q->where('restaurant_id', $order->restaurant_id)->where('created_at', '>=', $order->created_at)))
                ->exists();
            if ($reviewed) {
                continue;
            }
            [$title, $body] = MessageCatalog::reviewRequest($order->restaurant?->name ?? 'restaurante', $order->id);
            $sent += (int) $this->deliver($user, 'review_request', (string) $order->id, $title, $body, '/pedidos', $now);
        }

        return $sent;
    }

    /** Quem não abre a app há 7/14/30 dias (corre 1x/dia). */
    public function sendWinBack(?CarbonImmutable $now = null): int
    {
        $now ??= CarbonImmutable::now();
        if (! $this->isMarketingHour($now)) {
            return 0;
        }
        $sent = 0;

        $this->eligibleUsers(marketing: true)
            ->where('created_at', '<=', $now->subDays(min(self::WIN_BACK_TIERS)))
            ->chunkById(200, function ($users) use ($now, &$sent) {
                foreach ($users as $user) {
                    $lastActive = $this->lastActivity($user);
                    if (! $lastActive) {
                        continue;
                    }
                    $days = (int) floor($lastActive->diffInDays($now));
                    $tier = collect(self::WIN_BACK_TIERS)->first(fn (int $t) => $days >= $t);
                    if (! $tier) {
                        continue;
                    }
                    // A referência inclui o dia da última atividade: quem
                    // volta e depois desaparece de novo recomeça os escalões.
                    $ref = "{$tier}d-".$lastActive->toDateString();
                    [$title, $body] = MessageCatalog::winBack($tier, $user->id);
                    $sent += (int) $this->deliver($user, 'win_back', $ref, $title, $body, '/', $now);
                }
            });

        return $sent;
    }

    /** Clientes com push ligado e sem opt-out. */
    private function eligibleUsers(bool $marketing): Builder
    {
        return User::query()
            ->where('role', 'customer')
            ->whereHas('deviceTokens')
            ->whereDoesntHave('preferences', fn ($q) => $q
                ->where('notifications_enabled', false)
                ->when($marketing, fn ($q) => $q->orWhere('engagement_notifications', false)));
    }

    private function wantsNotifications(User $user, bool $marketing): bool
    {
        if (! $user->deviceTokens()->exists()) {
            return false;
        }
        $prefs = $user->preferences;

        return ! $prefs || ($prefs->notifications_enabled !== false && (! $marketing || $prefs->engagement_notifications !== false));
    }

    /** Envia uma vez (chave única) e respeita os limites de marketing. */
    private function deliver(User $user, string $kind, string $ref, string $title, string $body, string $url, CarbonImmutable $now): bool
    {
        if (in_array($kind, self::MARKETING_KINDS, true)) {
            $recent = EngagementNotification::query()
                ->where('user_id', $user->id)
                ->whereIn('kind', self::MARKETING_KINDS)
                ->where('sent_at', '>=', $now->subDays(7))
                ->pluck('sent_at');
            if ($recent->count() >= self::MAX_MARKETING_PER_WEEK || $recent->contains(fn ($at) => $at >= $now->subHours(20))) {
                return false;
            }
        }

        // ON CONFLICT DO NOTHING: já enviado (chave única) não é erro — e uma
        // exceção aqui abortava a transação em curso no Postgres.
        $inserted = EngagementNotification::query()->insertOrIgnore([
            'user_id' => $user->id, 'kind' => $kind, 'ref' => $ref, 'sent_at' => $now,
        ]);
        if ($inserted === 0) {
            return false;
        }

        $this->push->sendMessage($user, $title, $body, $url, 'engagement');

        return true;
    }

    /** @return array{restaurant: Restaurant, dish: ?string}|null */
    private function favoriteFor(User $user): ?array
    {
        $restaurantId = Order::query()
            ->where('user_id', $user->id)
            ->whereIn('status', self::FINISHED_ORDER_STATUSES)
            ->select('restaurant_id', DB::raw('count(*) as n'))
            ->groupBy('restaurant_id')
            ->orderByDesc('n')
            ->value('restaurant_id');

        $restaurant = $restaurantId
            ? Restaurant::query()->listed()->visibleToCustomers()->where('orders_paused_manually', false)->find($restaurantId)
            : null;
        if (! $restaurant) {
            return null;
        }

        $dish = DB::table('order_lines')
            ->join('orders', 'orders.id', '=', 'order_lines.order_id')
            ->where('orders.user_id', $user->id)
            ->where('orders.restaurant_id', $restaurant->id)
            ->select('order_lines.item_name_snapshot', DB::raw('sum(order_lines.qty) as q'))
            ->groupBy('order_lines.item_name_snapshot')
            ->orderByDesc('q')
            ->value('order_lines.item_name_snapshot');

        return ['restaurant' => $restaurant, 'dish' => $dish ?: null];
    }

    private function lastActivity(User $user): ?CarbonImmutable
    {
        $candidates = array_filter([
            DB::table('personal_access_tokens')
                ->where('tokenable_type', $user->getMorphClass())
                ->where('tokenable_id', $user->id)
                ->max('last_used_at'),
            $user->last_login_at,
            $user->orders()->max('created_at'),
            $user->created_at,
        ]);

        return $candidates === []
            ? null
            : collect($candidates)->map(fn ($d) => CarbonImmutable::parse($d))->max();
    }

    private function isMarketingHour(CarbonImmutable $now): bool
    {
        $time = $now->timezone(self::TIMEZONE)->format('H:i');

        return $time >= '08:00' && $time < '21:30';
    }
}
