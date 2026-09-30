<?php

namespace App\Services;

use Illuminate\Filesystem\FilesystemAdapter;
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
        Storage::disk('r2')->delete($path);
    }
}
