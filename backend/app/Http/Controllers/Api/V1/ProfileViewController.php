<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Jobs\SendPushNotificationJob;
use App\Models\FollowInvite;
use App\Models\Notification;
use App\Models\ProfileView;
use App\Models\Restaurant;
use App\Services\FollowInvitePolicy;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * "Quem viu o seu perfil" — visitantes únicos da página pública do
 * restaurante e convite "siga-nos".
 *
 * Privacidade: o restaurante vê só o NOME de quem tem conta — nunca email,
 * telefone ou outro contacto. Convidados aparecem sem nome.
 */
class ProfileViewController extends Controller
{
    public function __construct(private readonly FollowInvitePolicy $invites) {}

    /** Público (cliente com conta OU convidado). Não conta o próprio staff. */
    public function record(Request $request, Restaurant $restaurant): JsonResponse
    {
        $data = $request->validate(['visitor_key' => ['nullable', 'string', 'max:64']]);
        $user = $request->user('sanctum');

        if ($user?->can('manageOperations', $restaurant)) {
            return response()->json(status: 204);
        }
        if (! $user && empty($data['visitor_key'])) {
            return response()->json(status: 204);
        }

        $viewerKey = $user ? "user:{$user->id}" : 'guest:'.$data['visitor_key'];
        $now = now();

        DB::transaction(function () use ($restaurant, $user, $viewerKey, $now) {
            $view = ProfileView::query()
                ->where('restaurant_id', $restaurant->id)
                ->where('viewer_key', $viewerKey)
                ->lockForUpdate()
                ->first();

            if (! $view) {
                ProfileView::query()->create([
                    'restaurant_id' => $restaurant->id,
                    'user_id' => $user?->id,
                    'viewer_key' => $viewerKey,
                    'visits' => 1,
                    'first_at' => $now,
                    'last_at' => $now,
                ]);

                return;
            }

            // Refresh / voltar atrás dentro da janela = mesma visita.
            if ($view->last_at->gt($now->copy()->subMinutes(ProfileView::SESSION_WINDOW_MINUTES))) {
                return;
            }

            $view->update(['visits' => $view->visits + 1, 'last_at' => $now]);
        });

        return response()->json(status: 204);
    }

    /** Staff do restaurante: totais + últimos visitantes. */
    public function index(Request $request, Restaurant $restaurant): JsonResponse
    {
        $this->authorize('manageOperations', $restaurant);

        $base = ProfileView::query()->where('restaurant_id', $restaurant->id);
        $now = now();

        $viewers = (clone $base)->with('user:id,name')
            ->orderByDesc('last_at')
            ->limit($request->integer('limit', 50))
            ->get();

        $userIds = $viewers->pluck('user_id')->filter()->values();
        $followingIds = $restaurant->followers()->whereIn('users.id', $userIds)->pluck('users.id')->flip();
        $invitesByUser = FollowInvite::query()
            ->where('restaurant_id', $restaurant->id)
            ->whereIn('user_id', $userIds)
            ->get()
            ->keyBy('user_id');
        $sentToday = $this->invites->sentToday($restaurant);

        return response()->json([
            'data' => [
                'totals' => [
                    'total' => (clone $base)->count(),
                    'today' => (clone $base)->where('last_at', '>=', $now->copy()->subDay())->count(),
                    'week' => (clone $base)->where('last_at', '>=', $now->copy()->subDays(7))->count(),
                    'prevWeek' => (clone $base)
                        ->where('last_at', '>=', $now->copy()->subDays(14))
                        ->where('last_at', '<', $now->copy()->subDays(7))
                        ->count(),
                    'newThisWeek' => (clone $base)->where('first_at', '>=', $now->copy()->subDays(7))->count(),
                ],
                'invitesLeftToday' => max(0, FollowInvitePolicy::DAILY_CAP - $sentToday),
                'viewers' => $viewers->map(function (ProfileView $v) use ($restaurant, $followingIds, $invitesByUser, $sentToday) {
                    $invite = $v->user_id ? $invitesByUser->get($v->user_id) : null;
                    $following = $v->user_id !== null && $followingIds->has($v->user_id);
                    $reason = $following
                        ? 'following'
                        : $this->invites->blockReason($restaurant, $v->user, $invite ?? new FollowInvite, $sentToday);

                    return [
                        'id' => $v->uuid,
                        'name' => $v->user?->name,
                        'isGuest' => $v->user_id === null,
                        'visits' => $v->visits,
                        'firstAt' => $v->first_at->toIso8601String(),
                        'lastAt' => $v->last_at->toIso8601String(),
                        'following' => $following,
                        'invite' => [
                            'canInvite' => $reason === null,
                            'blockReason' => $reason,
                            'lastSentAt' => $invite?->last_sent_at?->toIso8601String(),
                        ],
                    ];
                }),
            ],
        ]);
    }

    /** Staff convida um visitante (com conta) a seguir o restaurante. */
    public function invite(Request $request, Restaurant $restaurant, ProfileView $profileView): JsonResponse
    {
        $this->authorize('manageOperations', $restaurant);
        abort_unless($profileView->restaurant_id === $restaurant->id, 404);

        $user = $profileView->user;
        $invite = $user
            ? FollowInvite::query()->where('restaurant_id', $restaurant->id)->where('user_id', $user->id)->first()
            : null;

        $reason = $this->invites->blockReason($restaurant, $user, $invite ?? new FollowInvite);
        if ($reason !== null) {
            return response()->json([
                'message' => 'Não é possível convidar este visitante agora.',
                'reason' => $reason,
            ], 422);
        }

        FollowInvite::query()->updateOrCreate(
            ['restaurant_id' => $restaurant->id, 'user_id' => $user->id],
            ['last_sent_at' => now(), 'declined_at' => null, 'accepted_at' => null],
        );

        $notification = Notification::query()->create([
            'user_id' => $user->id,
            'kind' => 'restaurant',
            'ref_id' => $restaurant->id,
            'event' => 'followInvite',
            'status_snapshot' => '',
        ]);
        SendPushNotificationJob::dispatch($user, $notification);

        return response()->json(['data' => [
            'id' => $profileView->uuid,
            'invite' => [
                'canInvite' => false,
                'blockReason' => 'recent',
                'lastSentAt' => now()->toIso8601String(),
            ],
            'invitesLeftToday' => max(0, FollowInvitePolicy::DAILY_CAP - $this->invites->sentToday($restaurant)),
        ]]);
    }

    /** Cliente: "Agora não" a um convite. */
    public function decline(Request $request, Restaurant $restaurant): JsonResponse
    {
        FollowInvite::query()
            ->where('restaurant_id', $restaurant->id)
            ->where('user_id', $request->user()->id)
            ->update(['declined_at' => now()]);

        return response()->json(status: 204);
    }

    /** Cliente: não receber mais convites deste restaurante. */
    public function mute(Request $request, Restaurant $restaurant): JsonResponse
    {
        FollowInvite::query()->updateOrCreate(
            ['restaurant_id' => $restaurant->id, 'user_id' => $request->user()->id],
            ['muted_at' => now()],
        );

        return response()->json(status: 204);
    }
}
