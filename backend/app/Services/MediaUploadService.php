<?php

namespace App\Services;

use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

/**
 * Pipeline de upload (ver plano, secção "Imagens/vídeos"). O frontend já
 * faz resize/crop por preset antes de enviar (dish 1:1/900px, cover
 * 16:9/1600px, gallery 16:9/1280px, promo 16:9/1400px, story 9:16/1280px) —
 * aqui valida, guarda o original tal como veio e gera ao lado as miniaturas
 * WebP (ver `storeThumbnails`) para as listas não descarregarem a foto
 * inteira por cada cartão.
 *
 * Vídeo (stories + ofertas, Fase 4) vai por fila Redis
 * (ProcessUploadedVideoJob, ffmpeg) — `storeRawVideo()` abaixo só guarda o
 * ficheiro bruto num disco privado para o job apanhar; nunca fica público
 * nesse estado. Imagem continua sempre síncrona por ser rápido.
 */
class MediaUploadService
{
    // Os 5 presets já usados no crop client-side (ver plano) — "story" aqui
    // é só a variante imagem (vídeo de story vai por storeRawVideo).
    private const IMAGE_PURPOSES = ['dish', 'cover', 'wallpaper', 'gallery', 'promo', 'story', 'partner', 'site'];

    /** Aceitam imagem OU PDF (ver storeDocument). "invoice" = fatura emitida
     * pelo restaurante; "payment-proof" = comprovativo de pagamento anexado
     * pelo cliente a um pedido (Fase 3) — bancos/carteiras digitais em
     * Angola muitas vezes geram o comprovativo como PDF, não imagem; sem
     * isto, o upload rejeitava sempre PDF com 422, só imagem funcionava. */
    private const DOCUMENT_PURPOSES = ['invoice', 'payment-proof'];

    /** Só os 2 media_type que aceitam vídeo no schema (ver migrations). */
    private const VIDEO_PURPOSES = ['story', 'promo', 'site'];

    private const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB

    /** Validade dos URLs assinados dos documentos — longa o suficiente para
     * um painel aberto (que refaz o pedido periodicamente) não ficar com
     * imagens partidas, curta o suficiente para um URL reencaminhado deixar
     * de abrir no mesmo dia. */
    private const DOCUMENT_URL_TTL_MINUTES = 120;

    private const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100MB — bruto, antes do ffmpeg recomprimir

    /** Larguras das miniaturas de cada imagem pública: avatares/linhas
     * (160), cartões (480) e largura total do telemóvel (960). Existem
     * SEMPRE as três — num original mais estreito, a miniatura fica com a
     * largura dele (nunca amplia) — para o frontend poder montar o URL por
     * convenção (`thumbnailPath`) sem nunca pedir uma que não existe. */
    public const THUMBNAIL_WIDTHS = [160, 480, 960];

    /** Ficheiros públicos nunca mudam depois de gravados (cada upload tem um
     * uuid novo no nome) — podem ficar em cache um ano. Antes ficavam 1h:
     * quem voltava à app no dia seguinte descarregava todas as fotos outra
     * vez. */
    private const PUBLIC_CACHE_CONTROL = 'public, max-age=31536000, immutable';

    /** Acima disto não gera miniaturas: descodificar a imagem inteira em
     * memória (4 bytes/píxel) arriscava rebentar o memory_limit do PHP e
     * derrubar o upload todo. Os presets do frontend nunca passam de
     * 1600×900; isto só apanha fotos cruas (ex.: formulário de parceiro). */
    private const MAX_THUMBNAIL_SOURCE_PIXELS = 25_000_000;

    public function storeImage(UploadedFile $file, string $purpose, string $ownerSegment): string
    {
        if (! in_array($purpose, self::IMAGE_PURPOSES, true)) {
            throw new RuntimeException('invalid_upload_purpose');
        }

        if ($file->getSize() > self::MAX_IMAGE_BYTES) {
            throw new RuntimeException('file_too_large');
        }

        $mime = $file->getMimeType();
        if (! str_starts_with((string) $mime, 'image/')) {
            throw new RuntimeException('invalid_mime_type');
        }

        $extension = $file->extension() ?: 'jpg';
        $path = "{$purpose}/{$ownerSegment}/".Str::uuid().".{$extension}";

        return $this->putPublicImage($path, (string) file_get_contents($file->getRealPath()));
    }

    /** Pastas do bucket público com imagens (as mesmas dos uploads) — o
     * comando `media:thumbnails` percorre só estas. */
    public static function publicImagePrefixes(): array
    {
        return self::IMAGE_PURPOSES;
    }

    /** Imagem pública já validada: grava o original e as miniaturas.
     * Devolve o URL público do original. */
    public function putPublicImage(string $path, string $contents): string
    {
        $this->putPublic($path, $contents);
        $this->storeThumbnails($path, $contents);

        return Storage::disk('r2')->url($path);
    }

    /** Qualquer ficheiro do bucket público (imagem, vídeo, capa de vídeo) —
     * sempre com cache de um ano, ver PUBLIC_CACHE_CONTROL. */
    public function putPublic(string $path, string $contents): void
    {
        Storage::disk('r2')->put($path, $contents, [
            'visibility' => 'public',
            'CacheControl' => self::PUBLIC_CACHE_CONTROL,
        ]);
    }

    /** `dish/x/<uuid>.jpg` → `dish/x/<uuid>.w480.webp`. O frontend monta o
     * mesmo nome a partir do URL do original (src/lib/image-cdn.ts) — mudar
     * aqui obriga a mudar lá. */
    public static function thumbnailPath(string $path, int $width): string
    {
        return preg_replace('/\.[A-Za-z0-9]+$/', '', $path).".w{$width}.webp";
    }

    public static function isThumbnailPath(string $path): bool
    {
        return (bool) preg_match('/\.w\d+\.webp$/', $path);
    }

    public static function isImagePath(string $path): bool
    {
        return (bool) preg_match('/\.(jpe?g|png|webp|gif)$/i', $path);
    }

    /**
     * Gera as miniaturas WebP de `THUMBNAIL_WIDTHS` ao lado do original.
     * Nunca deixa o upload falhar por causa delas: sem suporte WebP no GD,
     * formato que o GD não lê, imagem gigante ou erro a gravar → regista e
     * devolve `false`; o frontend, sem miniatura, volta ao original.
     */
    public function storeThumbnails(string $path, string $contents): bool
    {
        if (! function_exists('imagewebp')) {
            return false;
        }

        $info = @getimagesizefromstring($contents);
        if (! $info || $info[0] < 1 || $info[1] < 1 || $info[0] * $info[1] > self::MAX_THUMBNAIL_SOURCE_PIXELS) {
            return false;
        }

        try {
            $source = @imagecreatefromstring($contents);
            if ($source === false) {
                return false;
            }
            $width = imagesx($source);
            $height = imagesy($source);

            foreach (self::THUMBNAIL_WIDTHS as $target) {
                $thumbWidth = min($target, $width);
                $thumbHeight = max(1, (int) round($height * $thumbWidth / $width));
                $thumb = imagecreatetruecolor($thumbWidth, $thumbHeight);
                // Mantém a transparência de PNGs (logótipos).
                imagealphablending($thumb, false);
                imagesavealpha($thumb, true);
                imagecopyresampled($thumb, $source, 0, 0, 0, 0, $thumbWidth, $thumbHeight, $width, $height);

                ob_start();
                try {
                    imagewebp($thumb, null, 78);
                } finally {
                    $bytes = (string) ob_get_clean();
                }
                $this->putPublic(self::thumbnailPath($path, $target), $bytes);
            }

            return true;
        } catch (Throwable $e) {
            report($e);

            return false;
        }
    }

    /**
     * Comprovativo de pagamento / fatura (imagem OU PDF) — dados pessoais e
     * bancários, por isso NUNCA no bucket público (auditoria de segurança,
     * Fase 2): vai para o disco `filesystems.documents_disk` (bucket R2
     * privado em produção) e devolve o PATH, não um URL. Quem guarda o path
     * (colunas `payment_proof_url`/`invoice_url`, nome histórico) serve-o
     * sempre por `documentUrl()`, que assina um URL temporário.
     */
    public function storeDocument(UploadedFile $file, string $purpose, string $ownerSegment): string
    {
        if (! in_array($purpose, self::DOCUMENT_PURPOSES, true)) {
            throw new RuntimeException('invalid_upload_purpose');
        }

        if ($file->getSize() > self::MAX_IMAGE_BYTES) {
            throw new RuntimeException('file_too_large');
        }

        $mime = (string) $file->getMimeType();
        if (! str_starts_with($mime, 'image/') && $mime !== 'application/pdf') {
            throw new RuntimeException('invalid_mime_type');
        }

        $extension = $file->extension() ?: ($mime === 'application/pdf' ? 'pdf' : 'jpg');
        $path = "{$purpose}/{$ownerSegment}/".Str::uuid().".{$extension}";

        $this->documentsDisk()->put($path, file_get_contents($file->getRealPath()));

        return $path;
    }

    /**
     * URL para mostrar um documento guardado por `storeDocument()` — assinado,
     * válido DOCUMENT_URL_TTL_MINUTES. Só é chamado ao serializar um
     * pedido/reserva para quem já passou a autorização (dono, convidado com
     * guest_token, staff do restaurante).
     *
     * Valores antigos (antes da Fase 2) são URLs públicos completos — ficam
     * como estão até `documents:privatize` os mover para o bucket privado.
     */
    public function documentUrl(?string $stored): ?string
    {
        if (! $stored) {
            return null;
        }

        if (str_starts_with($stored, 'http://') || str_starts_with($stored, 'https://')) {
            return $stored;
        }

        return $this->documentsDisk()->temporaryUrl($stored, now()->addMinutes(self::DOCUMENT_URL_TTL_MINUTES));
    }

    /** Apaga um documento substituído (path privado ou URL público antigo). */
    public function deleteDocument(?string $stored): void
    {
        if (! $stored) {
            return;
        }

        if (str_starts_with($stored, 'http://') || str_starts_with($stored, 'https://')) {
            $this->deleteByUrl($stored);

            return;
        }

        $this->documentsDisk()->delete($stored);
    }

    public function documentsDisk(): FilesystemAdapter
    {
        return Storage::disk(config('filesystems.documents_disk'));
    }

    /**
     * Guarda o vídeo bruto no disco privado ("local", storage/app/private —
     * nunca servido diretamente) para ProcessUploadedVideoJob apanhar; quem
     * chamar isto é responsável por marcar o recurso como
     * `processing_status = processing` e despachar o job com o path
     * devolvido. Devolve o path RELATIVO ao disco, não um URL (não há URL
     * público nenhum neste estado).
     */
    public function storeRawVideo(UploadedFile $file, string $purpose, string $ownerSegment): string
    {
        if (! in_array($purpose, self::VIDEO_PURPOSES, true)) {
            throw new RuntimeException('invalid_upload_purpose');
        }

        if ($file->getSize() > self::MAX_VIDEO_BYTES) {
            throw new RuntimeException('file_too_large');
        }

        $mime = $file->getMimeType();
        if (! str_starts_with((string) $mime, 'video/')) {
            throw new RuntimeException('invalid_mime_type');
        }

        $extension = $file->extension() ?: 'mp4';
        $path = "raw-video/{$purpose}/{$ownerSegment}/".Str::uuid().".{$extension}";

        Storage::disk('local')->put($path, file_get_contents($file->getRealPath()));

        return $path;
    }

    public function deleteByUrl(?string $url): void
    {
        if (! $url) {
            return;
        }

        $publicBase = rtrim((string) config('filesystems.disks.r2.url'), '/');
        if (! str_starts_with($url, $publicBase)) {
            return; // não é um URL nosso (ex: link colado externo) — nada a apagar
        }

        $path = ltrim(substr($url, strlen($publicBase)), '/');
        $thumbnails = self::isImagePath($path) && ! self::isThumbnailPath($path)
            ? array_map(fn (int $w) => self::thumbnailPath($path, $w), self::THUMBNAIL_WIDTHS)
            : [];
        Storage::disk('r2')->delete([$path, ...$thumbnails]);
    }
}
