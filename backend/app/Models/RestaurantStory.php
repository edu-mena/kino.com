<?php

namespace App\Models;

use App\Models\Concerns\HasPublicUuid;
use App\Observers\RestaurantStoryObserver;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

#[ObservedBy(RestaurantStoryObserver::class)]
class RestaurantStory extends Model
{
    use HasFactory, HasPublicUuid, SoftDeletes;

    protected $fillable = [
        'restaurant_id', 'media_url', 'media_type', 'duration_sec', 'processing_status',
        'text', 'link',
    ];

    public function restaurant(): BelongsTo
    {
        return $this->belongsTo(Restaurant::class);
    }

    /** Últimas 24h — TTL real aplicado aqui, não mais calculado no cliente.
     * Vídeo ainda em processamento não conta como "fresco visível" — só
     * aparece na listagem pública quando `processing_status = ready`. */
    public function scopeFresh(Builder $query): Builder
    {
        return $query->where('created_at', '>', now()->subHours(24))
            ->where('processing_status', 'ready');
    }

    public function scopeGlobal(Builder $query): Builder
    {
        return $query->whereNull('restaurant_id');
    }
}
