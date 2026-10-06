<?php

namespace App\Models;

use App\Models\Concerns\HasPublicUuid;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\MassPrunable;
use Illuminate\Database\Eloquent\Model;

/** Denúncia de conteúdo (avaliação, story ou promoção) — ver ModerationService. */
class ContentReport extends Model
{
    use HasPublicUuid, MassPrunable;

    public const REASONS = ['offensive', 'spam', 'false_info', 'other'];

    /** Tipo público (rota/API) → model. */
    public const TYPES = [
        'review' => Review::class,
        'story' => RestaurantStory::class,
        'offer' => Offer::class,
    ];

    protected $fillable = [
        'reportable_type', 'reportable_id', 'reporter_user_id', 'reporter_key',
        'reason', 'details', 'status', 'resolved_by', 'resolved_at',
    ];

    protected function casts(): array
    {
        return ['resolved_at' => 'datetime'];
    }

    /** Retenção (model:prune diário): denúncias já decididas, 12 meses. */
    public function prunable(): Builder
    {
        return static::query()->where('status', '!=', 'pending')->where('resolved_at', '<', now()->subMonths(12));
    }
}
