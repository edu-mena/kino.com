<?php

namespace App\Jobs;

use App\Models\RestaurantStory;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Soft-delete das stories com mais de 24h — `RestaurantStory::scopeFresh()`
 * já as esconde de qualquer leitura pública mesmo sem isto (defesa em
 * profundidade dupla: filtro de query + limpeza física), mas sem este job
 * as linhas acumulavam para sempre na BD. Agendado a cada 15min (ver
 * routes/console.php) — mesmo padrão do scheduler descrito no plano.
 */
class ExpireStoriesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(): void
    {
        RestaurantStory::query()
            ->where('created_at', '<=', now()->subHours(24))
            ->delete();
    }
}
