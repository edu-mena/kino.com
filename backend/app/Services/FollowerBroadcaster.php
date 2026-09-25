<?php

namespace App\Services;

use App\Jobs\NotifyFollowersJob;
use App\Jobs\NotifyFollowersOfPriceChangesJob;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

/**
 * Avisa quem segue um restaurante (story novo, promoção nova, preços
 * mudados). Política anti-spam, toda aqui para nunca divergir entre
 * observers:
 *
 * - cada story/promoção avisa no máximo UMA vez (`claim`), mesmo que o
 *   vídeo volte a processar numa edição;
 * - mudanças de preço agrupadas: a primeira abre uma janela de
 *   PRICE_WINDOW_SECONDS, as seguintes só somam ao contador, e sai UMA
 *   notificação "atualizou N preços" no fim;
 * - no máximo DAILY_CAP avisos por restaurante por dia — acima disso, o
 *   resto do dia fica em silêncio (o cliente continua a ver tudo na
 *   página do restaurante).
 */
class FollowerBroadcaster
{
    public const DAILY_CAP = 5;

    public const PRICE_WINDOW_SECONDS = 600;

    /** Reclama `$model` (story/oferta) para aviso — `true` só para quem
     * ganhou a corrida; UPDATE condicional, atómico no Postgres. */
    public function claim(Model $model): bool
    {
        $claimed = $model->newQuery()
            ->whereKey($model->getKey())
            ->whereNull('followers_notified_at')
            ->update(['followers_notified_at' => now()]);

        return $claimed === 1;
    }

    public function broadcast(int $restaurantId, string $event, string $snapshot = ''): void
    {
        if (! $this->withinDailyCap($restaurantId)) {
            return;
        }

        NotifyFollowersJob::dispatch($restaurantId, $event, $snapshot);
    }

    public function priceChanged(int $restaurantId): void
    {
        Cache::add($this->priceCounterKey($restaurantId), 0, now()->addDay());
        Cache::increment($this->priceCounterKey($restaurantId));

        // `add` só grava se ainda não existir — só a 1ª mudança da janela
        // agenda o envio; as seguintes apenas contam.
        if (Cache::add($this->priceWindowKey($restaurantId), true, self::PRICE_WINDOW_SECONDS)) {
            NotifyFollowersOfPriceChangesJob::dispatch($restaurantId)
                ->delay(now()->addSeconds(self::PRICE_WINDOW_SECONDS));
        }
    }

    /** Chamado pelo job no fim da janela — devolve e zera o contador. */
    public function pullPriceChanges(int $restaurantId): int
    {
        Cache::forget($this->priceWindowKey($restaurantId));

        return (int) Cache::pull($this->priceCounterKey($restaurantId), 0);
    }

    private function withinDailyCap(int $restaurantId): bool
    {
        $key = "follower-broadcasts:{$restaurantId}:".now()->toDateString();
        Cache::add($key, 0, now()->endOfDay());

        return Cache::increment($key) <= self::DAILY_CAP;
    }

    private function priceCounterKey(int $restaurantId): string
    {
        return "follower-price-changes:{$restaurantId}";
    }

    private function priceWindowKey(int $restaurantId): string
    {
        return "follower-price-window:{$restaurantId}";
    }
}
