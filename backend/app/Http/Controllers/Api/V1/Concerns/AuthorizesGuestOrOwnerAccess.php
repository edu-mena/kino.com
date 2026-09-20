<?php

namespace App\Http\Controllers\Api\V1\Concerns;

use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Order/Reservation são acessíveis por (a) o user autenticado dono, ou (b)
 * um convidado que apresente o `guest_token` exato gravado no recurso — o
 * mesmo UUID devolvido na resposta de criação, nunca listável/adivinhável
 * (ver plano: "guest_token não pode abrir brecha de autorização").
 *
 * Comparação com `hash_equals` (tempo constante) para não vazar por timing
 * side-channel quanto do token está certo — 404, não 403, para também não
 * confirmar a um atacante que o `uuid` pedido existe mas o token é que
 * falhou (revelaria a mera existência do recurso a quem só adivinhou o id).
 */
trait AuthorizesGuestOrOwnerAccess
{
    protected function assertOwnerOrGuest(Request $request, object $resource): void
    {
        // 'sanctum' explícito (não $request->user() puro): estas rotas não
        // passam pelo middleware auth:sanctum (são acessíveis a convidados
        // sem token nenhum) — sem o guard explícito, o resolver por omissão
        // nem tentaria validar um Bearer token presente.
        $user = $request->user('sanctum');
        if ($user && $resource->user_id === $user->id) {
            return;
        }

        $providedToken = (string) ($request->header('X-Guest-Token') ?? $request->input('guest_token') ?? '');
        if ($resource->guest_token && $providedToken !== '' && hash_equals((string) $resource->guest_token, $providedToken)) {
            return;
        }

        throw new NotFoundHttpException;
    }
}
