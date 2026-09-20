<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Pipeline de upload (ver plano, secção "Imagens/vídeos"). O frontend já
 * faz resize/crop por preset antes de enviar (dish 1:1/900px, cover
 * 16:9/1600px, gallery 16:9/1280px, promo 16:9/1400px, story 9:16/1280px) —
 * aqui só valida e guarda; não reprocessa a imagem no servidor.
 *
 * Vídeo (stories + ofertas, Fase 4) vai por fila Redis
 * (ProcessUploadedVideoJob, ffmpeg) — `storeRawVideo()` abaixo só guarda o
 * ficheiro bruto num disco privado para o job apanhar; nunca fica público
 * nesse estado. Imagem continua sempre síncrona por ser rápido.
 */
class MediaUploadService
{
    // Os 5 presets já usados no crop client-side (ver plano) — "story" aqui
    // é só a variante imagem (vídeo de story vai por storeRawVideo) — mais
    // "payment-proof" (comprovativo de pagamento anexado pelo cliente a um
    // pedido, Fase 3), que não passa por crop/preset nenhum no cliente, só
    // validação de tipo/tamanho aqui.
    private const IMAGE_PURPOSES = ['dish', 'cover', 'wallpaper', 'gallery', 'promo', 'story', 'payment-proof', 'partner'];

    /** Aceitam imagem OU PDF (ver storeDocument) — fatura emitida pelo
     * restaurante, tal como no mock (`entrega.tsx`, `isPdfDataUrl`). */
    private const DOCUMENT_PURPOSES = ['invoice'];

    /** Só os 2 media_type que aceitam vídeo no schema (ver migrations). */
    private const VIDEO_PURPOSES = ['story', 'promo'];

    private const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB

    private const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100MB — bruto, antes do ffmpeg recomprimir

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

        Storage::disk('r2')->put($path, file_get_contents($file->getRealPath()), 'public');

        return Storage::disk('r2')->url($path);
    }

    /** Como `storeImage`, mas aceita imagem OU PDF — fatura emitida pelo
     * restaurante (ver DOCUMENT_PURPOSES). */
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

        Storage::disk('r2')->put($path, file_get_contents($file->getRealPath()), 'public');

        return Storage::disk('r2')->url($path);
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
        Storage::disk('r2')->delete($path);
    }
}
