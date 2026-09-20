<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\DeviceTokens\StoreDeviceTokenRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Destinos de push do utilizador autenticado — ver `PushNotificationService`
 * para o envio em si e `StoreDeviceTokenRequest` para porque `web` guarda o
 * objeto de subscrição inteiro (não um token simples) na coluna `token`.
 */
class DeviceTokenController extends Controller
{
    public function store(StoreDeviceTokenRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $token = $this->encodeToken($validated);

        // `updateOrCreate` pela combinação (user_id, token) — mesma
        // subscrição registada de novo (ex: reabrir a app) só atualiza
        // `last_seen_at`, nunca duplica a linha (ver unique da migração).
        $request->user()->deviceTokens()->updateOrCreate(
            ['token' => $token],
            [
                'platform' => $validated['platform'],
                'device_name' => $validated['device_name'] ?? null,
                'last_seen_at' => now(),
            ],
        );

        return response()->json(status: 204);
    }

    public function destroy(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'platform' => ['required', 'in:web,android,ios'],
            'subscription' => ['required_if:platform,web', 'array'],
            'subscription.endpoint' => ['required_if:platform,web', 'string'],
            'subscription.keys.p256dh' => ['required_if:platform,web', 'string'],
            'subscription.keys.auth' => ['required_if:platform,web', 'string'],
            'token' => ['required_if:platform,android,ios', 'string'],
        ]);

        $request->user()->deviceTokens()
            ->where('token', $this->encodeToken($validated))
            ->delete();

        return response()->json(status: 204);
    }

    /** `web` guarda o objeto de subscrição inteiro (json), como chegou do
     * browser — as outras plataformas guardam o token tal qual. */
    private function encodeToken(array $validated): string
    {
        return $validated['platform'] === 'web'
            ? json_encode($validated['subscription'], JSON_THROW_ON_ERROR)
            : $validated['token'];
    }
}
