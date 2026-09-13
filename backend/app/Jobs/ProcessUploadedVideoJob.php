<?php

namespace App\Jobs;

use App\Services\VideoTranscoder;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

/**
 * Recomprime um vídeo bruto (RestaurantStory ou Offer) via ffmpeg e publica
 * o resultado no disco público (R2) — nunca corre síncrono no request (ver
 * MediaUploadService::storeRawVideo). Genérico entre os dois models porque
 * os nomes de campo diferem (Offer usa `image_url`/`thumbnail_url`,
 * RestaurantStory só tem `media_url`, sem thumbnail) — passados
 * explicitamente em vez de assumir um shape comum.
 */
class ProcessUploadedVideoJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;

    public int $timeout = 360;

    public function __construct(
        public readonly string $modelClass,
        public readonly int $modelId,
        public readonly string $rawStoragePath,
        public readonly string $mediaUrlField,
        public readonly ?string $thumbnailField,
        public readonly string $publicPathPrefix,
    ) {}

    public function handle(VideoTranscoder $transcoder): void
    {
        /** @var Model|null $model */
        $model = $this->modelClass::find($this->modelId);
        if (! $model) {
            // Apagado entretanto (ex: staff removeu a story enquanto o
            // vídeo ainda processava) — nada a fazer, e o ficheiro bruto
            // ainda é limpo no finally abaixo.
            $this->cleanupRaw();

            return;
        }

        if (! Storage::disk('local')->exists($this->rawStoragePath)) {
            $model->update(['processing_status' => 'failed']);

            return;
        }

        $rawLocalPath = Storage::disk('local')->path($this->rawStoragePath);
        $outputLocalPath = tempnam(sys_get_temp_dir(), 'luku_video_').'.mp4';
        $thumbLocalPath = $this->thumbnailField ? tempnam(sys_get_temp_dir(), 'luku_thumb_').'.jpg' : null;

        try {
            $transcoder->transcode($rawLocalPath, $outputLocalPath);

            $videoPath = "{$this->publicPathPrefix}/{$model->id}/".Str::uuid().'.mp4';
            Storage::disk('r2')->put($videoPath, file_get_contents($outputLocalPath), 'public');

            $updates = [
                $this->mediaUrlField => Storage::disk('r2')->url($videoPath),
                'processing_status' => 'ready',
            ];

            if ($this->thumbnailField && $thumbLocalPath) {
                $transcoder->generateThumbnail($rawLocalPath, $thumbLocalPath);
                $thumbPath = "{$this->publicPathPrefix}/{$model->id}/".Str::uuid().'.jpg';
                Storage::disk('r2')->put($thumbPath, file_get_contents($thumbLocalPath), 'public');
                $updates[$this->thumbnailField] = Storage::disk('r2')->url($thumbPath);
            }

            $model->update($updates);
            // Só apaga o bruto DEPOIS de confirmar sucesso — numa falha
            // transitória (R2 em baixo, timeout, etc.) a tentativa seguinte
            // ($tries=2) precisa do ficheiro ainda lá. Apagá-lo em toda
            // tentativa (bug encontrado em revisão cruzada) fazia a 2ª
            // tentativa entrar em `handle()`, não encontrar o ficheiro, e
            // marcar `failed` sem nunca ter voltado a tentar transcodificar
            // — $tries=2 fingia existir retry mas era sempre 1 tentativa.
            $this->cleanupRaw();
        } catch (Throwable $e) {
            Log::error('ProcessUploadedVideoJob falhou', [
                'model' => $this->modelClass, 'id' => $this->modelId, 'error' => $e->getMessage(),
            ]);
            // NÃO apaga o bruto aqui nem marca `failed` — se ainda houver
            // tentativas, `failed()` só corre depois de esgotadas (ver
            // $tries acima); é lá que o estado terminal e a limpeza
            // acontecem de facto.
            throw $e;
        } finally {
            @unlink($outputLocalPath);
            if ($thumbLocalPath) {
                @unlink($thumbLocalPath);
            }
        }
    }

    /** Só corre depois de esgotadas todas as $tries — aqui sim é terminal:
     * marca failed e só agora liberta o ficheiro bruto. */
    public function failed(?Throwable $exception): void
    {
        $this->modelClass::query()->whereKey($this->modelId)->update(['processing_status' => 'failed']);
        $this->cleanupRaw();
    }

    private function cleanupRaw(): void
    {
        Storage::disk('local')->delete($this->rawStoragePath);
    }
}
