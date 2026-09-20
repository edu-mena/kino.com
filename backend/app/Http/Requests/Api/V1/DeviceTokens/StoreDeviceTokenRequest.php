<?php

namespace App\Http\Requests\Api\V1\DeviceTokens;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Regista (ou atualiza, se já existir — ver DeviceTokenController::store)
 * um destino de push para o utilizador autenticado. `web` e `android` são
 * enviados de verdade (ver PushNotificationService — `android` precisa de
 * `FIREBASE_CREDENTIALS` configurado, senão fica só guardado); `ios` ainda
 * não tem APNs ligado, fica só guardado.
 */
class StoreDeviceTokenRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'platform' => ['required', Rule::in(['web', 'android', 'ios'])],

            // Web Push não tem um "token" só — é o objeto de subscrição
            // inteiro (endpoint + duas chaves), tal como o browser o
            // devolve de `PushManager.subscribe()` (ver `.toJSON()`).
            'subscription' => ['required_if:platform,web', 'array'],
            'subscription.endpoint' => ['required_if:platform,web', 'string', 'max:2048'],
            'subscription.keys' => ['required_if:platform,web', 'array'],
            'subscription.keys.p256dh' => ['required_if:platform,web', 'string'],
            'subscription.keys.auth' => ['required_if:platform,web', 'string'],

            // Android/iOS: um token simples (FCM/APNs).
            'token' => ['required_if:platform,android,ios', 'string', 'max:4096'],

            'device_name' => ['nullable', 'string', 'max:120'],
        ];
    }
}
