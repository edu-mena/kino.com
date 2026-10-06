<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ContentReport;
use App\Models\Review;
use App\Services\ModerationService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Denúncias de conteúdo (App Store, guideline 1.2). Denunciar é público
 * (convidados também veem avaliações/stories/promoções); decidir é só para
 * a equipa Luku, em /sistema/denuncias. Regras em ModerationService.
 */
class ContentReportController extends Controller
{
    public function __construct(private readonly ModerationService $moderation) {}

    public function store(Request $request, string $type, string $uuid): JsonResponse
    {
        $content = $this->findContent($type, $uuid);
        $data = $request->validate([
            'reason' => ['required', Rule::in(ContentReport::REASONS)],
            'details' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);

        $this->moderation->report(
            $type, $content, $request->user('sanctum'), (string) $request->ip(),
            $data['reason'], $data['details'] ?? null,
        );

        return response()->json(['message' => 'Obrigado. A equipa Luku vai analisar a denúncia.'], 201);
    }

    /** Fila de moderação: um item por conteúdo com denúncias pendentes. */
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->isSystemOperator(), 403);

        $groups = ContentReport::query()
            ->where('status', 'pending')
            ->orderBy('created_at')
            ->get()
            ->groupBy(fn ($r) => $r->reportable_type.':'.$r->reportable_id);

        $items = $groups->map(function ($reports) {
            $first = $reports->first();
            $model = ContentReport::TYPES[$first->reportable_type];
            $content = $model::query()->find($first->reportable_id);
            if (! $content) {
                return null; // apagado entretanto (pelo dono, p.ex.)
            }

            return [
                'type' => $first->reportable_type,
                'contentId' => $content->uuid,
                'preview' => $this->preview($first->reportable_type, $content),
                'reportsCount' => $reports->count(),
                'reasons' => $reports->countBy('reason'),
                'details' => $reports->pluck('details')->filter()->values(),
                'firstReportedAt' => $first->created_at->toIso8601String(),
                'hidden' => $content instanceof Review && $content->hidden_at !== null,
            ];
        })->filter()->values();

        return response()->json(['data' => $items]);
    }

    public function resolve(Request $request, string $type, string $uuid): JsonResponse
    {
        abort_unless($request->user()->isSystemOperator(), 403);
        $content = $this->findContent($type, $uuid);
        $data = $request->validate(['action' => ['required', Rule::in(['remove', 'dismiss'])]]);

        $this->moderation->resolve($type, $content, $data['action'], $request->user());

        return response()->json(['message' => 'Decisão registada.']);
    }

    private function findContent(string $type, string $uuid): Model
    {
        abort_unless(isset(ContentReport::TYPES[$type]), 404);

        return ContentReport::TYPES[$type]::query()->where('uuid', $uuid)->firstOrFail();
    }

    /** O mínimo para decidir sem abrir outra página. */
    private function preview(string $type, Model $content): array
    {
        $restaurant = $content->restaurant?->name;

        return match ($type) {
            'review' => [
                'restaurant' => $restaurant,
                'author' => $content->customer_name,
                'rating' => $content->rating,
                'text' => $content->comment,
                'reply' => $content->reply_text,
            ],
            'story' => [
                'restaurant' => $restaurant,
                'text' => $content->text,
                'mediaUrl' => $content->media_url,
                'mediaType' => $content->media_type,
            ],
            default => [
                'restaurant' => $restaurant ?? 'Luku',
                'text' => trim($content->title.' — '.$content->description, ' —'),
                'mediaUrl' => $content->image_url,
                'mediaType' => $content->media_type,
            ],
        };
    }
}
