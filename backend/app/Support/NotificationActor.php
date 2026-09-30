<?php

namespace App\Support;

/**
 * De que lado veio a ação que gerou uma notificação de pedido/reserva — para
 * quem a fez não ser avisado da própria ação (criar/cancelar o próprio
 * pedido, aceitar/recusar no painel). A notificação continua a ser gravada
 * (histórico completo), mas já lida e sem push.
 *
 * - Pedido HTTP autenticado pelo dono do pedido/reserva → 'customer'.
 * - Pedido HTTP autenticado por outra conta (staff do restaurante, ou um
 *   operador de sistema a agir no painel) → 'restaurant'.
 * - Pedido HTTP sem sessão → 'customer' (só convidados escrevem sem conta:
 *   checkout, cancelar ou comprovativo com guest_token).
 * - Fora de um pedido HTTP (fila, agendador, artisan) → null: ninguém em
 *   particular agiu, os dois lados são avisados.
 */
final class NotificationActor
{
    /** @return 'customer'|'restaurant'|null */
    public static function side(?int $customerUserId): ?string
    {
        // Só há "quem agiu" dentro de um pedido HTTP a uma rota — fila,
        // agendador, artisan ou código a mexer direto nos modelos não têm.
        if (! app()->bound('request') || request()->route() === null) {
            return null;
        }

        $user = auth('sanctum')->user();
        if ($user === null) {
            return 'customer';
        }

        return $customerUserId !== null && $user->getKey() === $customerUserId
            ? 'customer'
            : 'restaurant';
    }
}
