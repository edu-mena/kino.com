<?php

namespace App\Services;

use App\Mail\ContentReportedMail;
use App\Models\ContentReport;
use App\Models\Offer;
use App\Models\Review;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

/**
 * Moderação de conteúdo (App Store, guideline 1.2): denunciar, decidir.
 *
 * - Cada pessoa denuncia o mesmo conteúdo uma vez (repetir não soma).
 * - Avaliação de cliente denunciada por AUTO_HIDE_AFTER pessoas diferentes
 *   sai do público logo, sem esperar pela equipa (o "filtro" pedido pela
 *   Apple); a equipa confirma (remove) ou repõe (dismiss).
 * - A equipa Luku recebe um email na 1ª denúncia de cada conteúdo — o
 *   compromisso nos Termos é responder em 24h.
 */
class ModerationService
{
    public const AUTO_HIDE_AFTER = 3;

    public function __construct(private readonly MediaUploadService $uploads) {}

    public function report(string $type, Model $content, ?User $reporter, string $ip, string $reason, ?string $details): ContentReport
    {
        $reporterKey = $reporter ? "user:{$reporter->id}" : 'ip:'.hash('sha256', $ip.config('app.key'));

        $report = ContentReport::query()->firstOrCreate(
            ['reportable_type' => $type, 'reportable_id' => $content->getKey(), 'reporter_key' => $reporterKey],
            ['reporter_user_id' => $reporter?->id, 'reason' => $reason, 'details' => $details],
        );

        if (! $report->wasRecentlyCreated) {
            return $report;
        }

        $pending = $this->pendingFor($type, $content->getKey())->count();

        if ($content instanceof Review && $content->hidden_at === null && $pending >= self::AUTO_HIDE_AFTER) {
            $content->forceFill(['hidden_at' => now()])->saveQuietly();
        }

        if ($pending === 1) {
            Mail::to(config('mail.contact_address'))->queue(new ContentReportedMail($type, $content->uuid, $reason, $details));
        }

        return $report;
    }

    /**
     * `remove`: o conteúdo sai (avaliação escondida; story/promoção apagadas
     * com o ficheiro). `dismiss`: denúncias sem fundamento — uma avaliação
     * escondida automaticamente volta a aparecer.
     */
    public function resolve(string $type, Model $content, string $action, User $operator): void
    {
        DB::transaction(function () use ($type, $content, $action, $operator) {
            $this->pendingFor($type, $content->getKey())->update([
                'status' => $action === 'remove' ? 'removed' : 'dismissed',
                'resolved_by' => $operator->id,
                'resolved_at' => now(),
            ]);

            if ($content instanceof Review) {
                $content->forceFill(['hidden_at' => $action === 'remove' ? now() : null])->saveQuietly();

                return;
            }

            if ($action === 'remove') {
                $files = $content instanceof Offer
                    ? [$content->image_url, $content->thumbnail_url]
                    : [$content->media_url];
                foreach ($files as $url) {
                    $this->uploads->deleteByUrl($url);
                }
                $content->delete();
            }
        });
    }

    private function pendingFor(string $type, int $id)
    {
        return ContentReport::query()
            ->where('reportable_type', $type)
            ->where('reportable_id', $id)
            ->where('status', 'pending');
    }
}
