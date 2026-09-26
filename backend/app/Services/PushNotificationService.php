<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\Restaurant;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Kreait\Firebase\Contract\Messaging as FirebaseMessaging;
use Kreait\Firebase\Messaging\AndroidConfig;
use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Messaging\Notification as FcmNotification;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;
use Throwable;

/**
 * Entrega uma `Notification` já persistida (ver Order/ReservationObserver)
 * às subscrições do utilizador — Web Push (`platform=web`) e Android via
 * Firebase Cloud Messaging (`platform=android`). iOS (APNs) continua fora
 * do escopo (ver `device_tokens`, coluna `platform` já preparada).
 *
 * FCM precisa de credenciais reais dum projeto Firebase
 * (`FIREBASE_CREDENTIALS`, ver config/firebase.php e capacitor/README.md
 * para o passo a passo de criar o projeto/`google-services.json`) — sem
 * isso configurado, vira no-op silencioso, mesmo padrão do Web Push sem
 * VAPID.
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

    private ?FirebaseMessaging $fcmClient = null;

    /** Mesma razão do `$attempted` acima, para o cliente FCM. */
    private bool $fcmAttempted = false;

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

    /** `null` = sem credenciais Firebase configuradas (`FIREBASE_CREDENTIALS`,
     * ver config/firebase.php) — o SDK só falha ao tentar USAR o componente,
     * não ao criar o container, por isso testa-se a config diretamente aqui
     * em vez de esperar pela exceção. */
    private function fcmClient(): ?FirebaseMessaging
    {
        if ($this->fcmAttempted) {
            return $this->fcmClient;
        }
        $this->fcmAttempted = true;

        if (! config('firebase.projects.'.config('firebase.default').'.credentials')) {
            return null;
        }

        try {
            return $this->fcmClient = app(FirebaseMessaging::class);
        } catch (Throwable $e) {
            Log::warning('fcm: falhou a criar o cliente', ['error' => $e->getMessage()]);

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
            Log::warning('push: envio falhou inesperadamente', [
                'notification_id' => $notification->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function doSendForNotification(User $user, Notification $notification): void
    {
        [$title, $body] = $this->textFor($notification);

        $this->sendWeb($user, $notification, $title, $body);
        $this->sendAndroid($user, $notification, $title, $body);
    }

    private function sendWeb(User $user, Notification $notification, string $title, string $body): void
    {
        $client = $this->client();
        if (! $client) {
            return;
        }

        $tokens = $user->deviceTokens()->where('platform', 'web')->get();
        if ($tokens->isEmpty()) {
            return;
        }

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

    /** Um só CloudMessage, enviado a todos os tokens Android do utilizador
     * de uma vez (`sendMulticast`) — o próprio relatório já diz quais
     * tokens ficaram inválidos/desconhecidos (app desinstalada, etc.),
     * apagados a seguir, mesmo espírito do 410/404 do Web Push acima. */
    private function sendAndroid(User $user, Notification $notification, string $title, string $body): void
    {
        $client = $this->fcmClient();
        if (! $client) {
            return;
        }

        $tokens = $user->deviceTokens()->where('platform', 'android')->pluck('token');
        if ($tokens->isEmpty()) {
            return;
        }

        $message = CloudMessage::new()
            ->withNotification(FcmNotification::create($title, $body))
            ->withData([
                'kind' => $notification->kind,
                'refId' => (string) $notification->ref_id,
                'url' => $this->urlFor($notification),
            ])
            // Canal com som próprio (Fase N5) — o id e o ficheiro (res/raw/,
            // sem extensão) têm de bater certo com LukuApplication.java e o
            // recurso .wav lá colocado. Android 8+ usa sempre o som do
            // CANAL (definido lá, uma vez, na app), nunca este aqui —
            // incluído mesmo assim como fallback em versões mais antigas.
            ->withAndroidConfig(AndroidConfig::fromArray([
                'notification' => [
                    'channel_id' => 'luku_default',
                    'sound' => 'notification_luku',
                ],
            ]));

        try {
            $report = $client->sendMulticast($message, $tokens->all());
        } catch (Throwable $e) {
            Log::warning('fcm: envio falhou', ['error' => $e->getMessage()]);

            return;
        }

        $stale = [...$report->invalidTokens(), ...$report->unknownTokens()];
        if ($stale !== []) {
            $user->deviceTokens()->where('platform', 'android')->whereIn('token', $stale)->delete();
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
        if ($notification->kind === 'restaurant') {
            $uuid = Restaurant::query()->whereKey($notification->ref_id)->value('uuid');

            return $uuid ? "/restaurantes/{$uuid}" : '/restaurantes';
        }

        $forRestaurant = $notification->restaurant_id !== null;

        if ($notification->kind === 'order') {
            return $forRestaurant ? '/admin/pedidos' : '/entrega';
        }

        return $forRestaurant ? '/admin/reservas' : '/reservas';
    }

    /** @return array{0: string, 1: string} [título, corpo] */
    private function textFor(Notification $notification): array
    {
        $name = $notification->kind === 'restaurant'
            ? (Restaurant::query()->whereKey($notification->ref_id)->value('name') ?? 'Luku')
            : ($notification->restaurant?->name ?? 'Luku');
        $snapshot = $notification->snapshot();
        // Notificações de seguidor (`followPriceChange`) continuam a guardar
        // só um número em `status_snapshot` — `snapshot()` devolve `null`
        // nesse caso (não é um JSON de objeto), por isso o valor bruto
        // continua disponível separadamente para elas.
        $rawSnapshot = (string) $notification->status_snapshot;

        $orderDetail = $snapshot
            ? sprintf('%d item(ns) · %s Kz', $snapshot['itemCount'] ?? 0, number_format((float) ($snapshot['total'] ?? 0), 0, ',', ' '))
            : null;
        $reservationDetail = $snapshot
            ? sprintf('%d pessoa(s) · %s', $snapshot['peopleCount'] ?? '?', $snapshot['time'] ?? '')
            : null;

        return match ($notification->event) {
            'orderNew' => ['Novo pedido', $orderDetail ? "Novo pedido em {$name} · {$orderDetail}" : "Novo pedido em {$name}"],
            'orderStatus' => ['Pedido atualizado', $orderDetail ? "Pedido em {$name} atualizado · {$orderDetail}" : "O seu pedido em {$name} foi atualizado"],
            'reservationNew' => ['Nova reserva', $reservationDetail ? "Nova reserva em {$name} · {$reservationDetail}" : "Nova reserva em {$name}"],
            'reservationStatus' => ['Reserva atualizada', $reservationDetail ? "Reserva em {$name} atualizada · {$reservationDetail}" : "A sua reserva em {$name} foi atualizada"],
            'orderPaymentProof' => ['Novo comprovativo', "Comprovativo de pagamento recebido — pedido em {$name}"],
            'orderInvoice' => ['Fatura emitida', "{$name} emitiu a fatura do seu pedido"],
            'reservationPaymentProof' => ['Novo comprovativo', "Comprovativo de pagamento recebido — reserva em {$name}"],
            'reservationInvoice' => ['Fatura emitida', "{$name} emitiu a fatura da sua reserva"],
            'followStoryNew' => [$name, "{$name} publicou um story novo"],
            'followOfferNew' => [$name, $rawSnapshot !== '' ? "Promoção nova: {$rawSnapshot}" : "{$name} lançou uma promoção"],
            'followPriceChange' => [$name, "{$name} atualizou {$rawSnapshot} preço(s) do cardápio"],
            'followInvite' => [$name, "{$name} convida-o a seguir o restaurante"],
            default => ['Luku', "Tem uma notificação nova de {$name}"],
        };
    }
}
