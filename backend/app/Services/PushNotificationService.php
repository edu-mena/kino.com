<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;
use Throwable;

/**
 * Web Push — entrega uma `Notification` já persistida (ver Order/
 * ReservationObserver) às subscrições `web` do utilizador. Sem cobertura
 * nativa (Android/iOS) nesta fase — precisaria de FCM/APNs, fora do escopo
 * (ver `device_tokens`, coluna `platform` já preparada para quando entrar).
 *
 * Texto só em português por agora — a app não tem (ainda) o idioma
 * preferido do utilizador acessível daqui de forma fiável em todos os
 * casos (convidado, etc.); ver `src/i18n/*.ts` no frontend para as mesmas
 * chaves `notifications.*` em en/fr, caso valha a pena replicar aqui depois.
 */
class PushNotificationService
{
    private ?WebPush $client = null;

    /** `true` depois da 1ª tentativa (com ou sem sucesso) — evita repetir
     * `new WebPush(...)` (e o log de aviso, se falhar) em todo envio dentro
     * do mesmo request/job; `$client` sozinho não chega porque `null` é
     * também o valor de "já tentei e falhou", não só de "ainda não tentei". */
    private bool $attempted = false;

    /** `null` = sem chaves VAPID configuradas, OU o pacote `minishlink/
     * web-push` ainda não foi instalado (`composer install` por correr) —
     * nos dois casos, todo o serviço vira no-op silencioso: nunca falha o
     * request/job que o chamou (é sempre um "extra", nunca o que a ação em
     * si estava a fazer — criar o pedido/reserva continua a funcionar). */
    private function client(): ?WebPush
    {
        if ($this->attempted) {
            return $this->client;
        }
        $this->attempted = true;

        $publicKey = config('services.vapid.public_key');
        $privateKey = config('services.vapid.private_key');
        if (! $publicKey || ! $privateKey) {
            return null;
        }

        if (! class_exists(WebPush::class)) {
            // Chaves configuradas mas o pacote não está instalado — não é
            // um estado esperado em produção, mas não pode derrubar quem
            // chamou (ver docstring da classe).
            Log::warning('web-push: minishlink/web-push não está instalado — a saltar o envio.');

            return null;
        }

        try {
            return $this->client = new WebPush([
                'VAPID' => [
                    'subject' => config('services.vapid.subject'),
                    'publicKey' => $publicKey,
                    'privateKey' => $privateKey,
                ],
            ]);
        } catch (Throwable $e) {
            Log::warning('web-push: falhou a criar o cliente', ['error' => $e->getMessage()]);

            return null;
        }
    }

    /** Envia para todas as subscrições `web` do utilizador — apaga sozinho
     * as que o browser já invalidou (o utilizador limpou os dados do site,
     * desinstalou, etc. — 410/404 do serviço de push). Nunca deixa uma
     * exceção sair daqui (ver classe) — um erro aqui é sempre secundário à
     * ação que gerou a notificação. */
    public function sendForNotification(User $user, Notification $notification): void
    {
        try {
            $this->doSendForNotification($user, $notification);
        } catch (Throwable $e) {
            Log::warning('web-push: envio falhou inesperadamente', [
                'notification_id' => $notification->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function doSendForNotification(User $user, Notification $notification): void
    {
        $client = $this->client();
        if (! $client) {
            return;
        }

        $tokens = $user->deviceTokens()->where('platform', 'web')->get();
        if ($tokens->isEmpty()) {
            return;
        }

        [$title, $body] = $this->textFor($notification);
        $payload = json_encode([
            'title' => $title,
            'body' => $body,
            'data' => [
                'kind' => $notification->kind,
                'refId' => $notification->ref_id,
                'url' => $this->urlFor($notification),
            ],
        ], JSON_THROW_ON_ERROR);

        $subscriptionsByEndpoint = [];
        foreach ($tokens as $deviceToken) {
            $subscription = $this->subscriptionFrom($deviceToken->token);
            if (! $subscription) {
                continue; // token corrompido/ilegível — ignora, não derruba o resto
            }
            $subscriptionsByEndpoint[$subscription->getEndpoint()] = $deviceToken;
            $client->queueNotification($subscription, $payload);
        }

        if ($subscriptionsByEndpoint === []) {
            return;
        }

        foreach ($client->flush() as $report) {
            if ($report->isSuccess()) {
                continue;
            }

            if ($report->isSubscriptionExpired()) {
                $subscriptionsByEndpoint[$report->getEndpoint()]?->delete();

                continue;
            }

            // Falha não relacionada com a subscrição em si (rede, etc.) —
            // regista mas não impede as outras subscrições/pedido.
            Log::warning('web-push: envio falhou', [
                'endpoint' => $report->getEndpoint(),
                'reason' => $report->getReason(),
            ]);
        }
    }

    private function subscriptionFrom(string $token): ?Subscription
    {
        try {
            $decoded = json_decode($token, associative: true, flags: JSON_THROW_ON_ERROR);

            return Subscription::create($decoded);
        } catch (Throwable) {
            return null;
        }
    }

    /** Caminho da app a abrir ao tocar na notificação — decidido aqui (não
     * no service worker) porque só o backend sabe se este registo é a
     * cópia do restaurante (`restaurant_id`) ou a do cliente (`user_id`);
     * nunca as duas ao mesmo tempo (ver Order/ReservationObserver::notify). */
    private function urlFor(Notification $notification): string
    {
        $forRestaurant = $notification->restaurant_id !== null;

        if ($notification->kind === 'order') {
            return $forRestaurant ? '/admin/pedidos' : '/entrega';
        }

        return $forRestaurant ? '/admin/reservas' : '/reservas';
    }

    /** @return array{0: string, 1: string} [título, corpo] */
    private function textFor(Notification $notification): array
    {
        $name = $notification->restaurant?->name ?? 'Luku';

        return match ($notification->event) {
            'orderNew' => ['Novo pedido', "Novo pedido em {$name}"],
            'orderStatus' => ['Pedido atualizado', "O seu pedido em {$name} foi atualizado"],
            'reservationNew' => ['Nova reserva', "Nova reserva em {$name}"],
            'reservationStatus' => ['Reserva atualizada', "A sua reserva em {$name} foi atualizada"],
            default => ['Luku', "Tem uma notificação nova de {$name}"],
        };
    }
}
