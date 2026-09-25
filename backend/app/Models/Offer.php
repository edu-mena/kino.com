<?php

namespace App\Models;

use App\Models\Concerns\HasPublicUuid;
use App\Observers\OfferObserver;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[ObservedBy(OfferObserver::class)]
class Offer extends Model
{
    use HasFactory, HasPublicUuid;

    protected $fillable = [
        'restaurant_id', 'type', 'title', 'description', 'code', 'percent_off',
        'image_url', 'media_type', 'thumbnail_url', 'layout', 'starts_at', 'ends_at',
        'processing_status', 'target_menu_item_ids', 'target_categories',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'followers_notified_at' => 'datetime',
            'target_menu_item_ids' => 'array',
            'target_categories' => 'array',
        ];
    }

    public function restaurant(): BelongsTo
    {
        return $this->belongsTo(Restaurant::class);
    }

    /** Ofertas "ao vivo" agora — usado por GET /offers e resolução de código. */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('starts_at', '<=', now())
            ->where(fn (Builder $q) => $q->whereNull('ends_at')->orWhere('ends_at', '>', now()));
    }

    public function scopeGlobal(Builder $query): Builder
    {
        return $query->whereNull('restaurant_id');
    }
}
