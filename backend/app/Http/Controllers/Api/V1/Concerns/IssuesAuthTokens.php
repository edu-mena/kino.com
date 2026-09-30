<?php

namespace App\Http\Controllers\Api\V1\Concerns;

use App\Http\Resources\Api\V1\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * Central de emissão de token — chamada por todo login (Google, staff,
 * operador depois do 2FA) e por `refresh()`.
 *
 * Carrega sempre `restaurantUsers.restaurant` antes de construir o
 * `UserResource`: sem isto, `UserResource` usa `whenLoaded('restaurantUsers')`
 * e devolve `restaurants` completamente ausente (não vazio) — o frontend do
 * painel de restaurante lê `data.user.restaurants[0]` logo a seguir ao login.
 * Inofensivo/barato para customer/operador (a relação fica vazia).
 */
trait IssuesAuthTokens
{
    protected function issueTokenResponse(Request $request, User $user, ?string $deviceName = null): JsonResponse
    {
        $deviceName ??= (string) $request->input('device_name', 'default');
        $token = $user->createToken($deviceName, [$user->role], $this->tokenExpiresAt($user));
        $user->loadMissing('restaurantUsers.restaurant');

        return response()->json([
            'data' => [
                'token' => $token->plainTextToken,
                'user' => new UserResource($user),
            ],
        ]);
    }

    /**
     * Duração por papel (auditoria de segurança, Fase 1): quanto maior o
     * poder da conta, mais curta a sessão. Operador 12h (acesso total a
     * todos os restaurantes; renovar exige novo login com 2FA), staff 30
     * dias, cliente usa o `sanctum.expiration` global (90 dias).
     */
    private function tokenExpiresAt(User $user): ?Carbon
    {
        return match ($user->role) {
            'system_operator' => now()->addHours(12),
            'restaurant_staff' => now()->addDays(30),
            default => null,
        };
    }
}
