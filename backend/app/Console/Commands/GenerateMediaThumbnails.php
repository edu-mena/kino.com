<?php

namespace App\Console\Commands;

use App\Services\MediaUploadService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

/**
 * Miniaturas para as imagens guardadas ANTES de o upload passar a gerá-las
 * (ver MediaUploadService::storeThumbnails). Percorre só as pastas públicas
 * de imagens; para cada original sem miniaturas, gera-as e volta a gravar
 * o original igual, agora com cache de um ano. Pode correr-se várias vezes:
 * o que já tem miniaturas fica como está. Imagens de URLs externos (links
 * colados de outros sites) não vivem no bucket — ficam de fora.
 */
class GenerateMediaThumbnails extends Command
{
    protected $signature = 'media:thumbnails {--dry-run : Só conta o que falta, sem escrever nada}';

    protected $description = 'Gera as miniaturas WebP em falta das imagens públicas e põe-lhes cache de 1 ano';

    public function handle(MediaUploadService $uploads): int
    {
        $disk = Storage::disk('r2');
        $dryRun = (bool) $this->option('dry-run');
        // A maior é a última a ser gravada — se existe, as outras também.
        $marker = max(MediaUploadService::THUMBNAIL_WIDTHS);
        $created = 0;
        $alreadyDone = 0;
        $failed = 0;

        foreach (MediaUploadService::publicImagePrefixes() as $prefix) {
            foreach ($disk->allFiles($prefix) as $path) {
                if (! MediaUploadService::isImagePath($path) || MediaUploadService::isThumbnailPath($path)) {
                    continue;
                }
                if ($disk->exists(MediaUploadService::thumbnailPath($path, $marker))) {
                    $alreadyDone++;

                    continue;
                }
                if ($dryRun) {
                    $created++;

                    continue;
                }

                $contents = (string) $disk->get($path);
                $uploads->putPublic($path, $contents);
                if ($uploads->storeThumbnails($path, $contents)) {
                    $created++;
                } else {
                    $failed++;
                    $this->warn("Sem miniaturas: {$path}");
                }
            }
        }

        $this->info(sprintf(
            '%s: %d — já tinham: %d — falharam: %d',
            $dryRun ? 'Por gerar' : 'Geradas',
            $created,
            $alreadyDone,
            $failed,
        ));

        return self::SUCCESS;
    }
}
