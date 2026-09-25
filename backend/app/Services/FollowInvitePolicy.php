<?php

namespace App\Services;

use App\Models\FollowInvite;
use App\Models\Restaurant;
use App\Models\User;

/**
 * Anti-spam dos convites "siga-nos" que o restaurante manda a quem viu o
 * perfil. O restaurante PODE convidar — estas regras só limitam a
 * frequência (espelhadas no front em @/lib/follow-invites para o modo demo):
 *
 * - só contas (um convidado não tem para onde receber);
 * - nunca a quem já segue o restaurante;
 * - um convite por cliente a cada RESEND_DAYS;
 * - depois de "Agora não", espera DECLINE_COOLDOWN_DAYS;
 * - o cliente pode silenciar os convites deste restaurante (para sempre);
 * - no máximo DAILY_CAP convites por restaurante por dia.
 */
class FollowInvitePolicy
{
    public const RESEND_DAYS = 30;

    public const DECLINE_COOLDOWN_DAYS = 90;

    public const DAILY_CAP = 30;

    /**
     * `null` = pode convidar; senão o motivo (chave estável, o front traduz):
     * guest | following | muted | declined | recent | daily_cap
     */
    public function blockReason(
        Restaurant $restaurant,
        ?User $user,
        ?FollowInvite $invite = null,
        ?int $sentToday = null,
    ): ?string {
        if (! $user) {
            return 'guest';
        }
        if ($restaurant->followers()->whereKey($user->id)->exists()) {
            return 'following';
        }

        $invite ??= FollowInvite::query()
            ->where('restaurant_id', $restaurant->id)
            ->where('user_id', $user->id)
            ->first();

        if ($invite?->muted_at) {
            return 'muted';
        }
        if ($invite?->declined_at && $invite->declined_at->gt(now()->subDays(self::DECLINE_COOLDOWN_DAYS))) {
            return 'declined';
        }
        if ($invite?->last_sent_at?->gt(now()->subDays(self::RESEND_DAYS))) {
            return 'recent';
        }
        if (($sentToday ?? $this->sentToday($restaurant)) >= self::DAILY_CAP) {
            return 'daily_cap';
        }

        return null;
    }

    public function sentToday(Restaurant $restaurant): int
    {
        return FollowInvite::query()
            ->where('restaurant_id', $restaurant->id)
            ->where('last_sent_at', '>=', now()->startOfDay())
            ->count();
    }
}
