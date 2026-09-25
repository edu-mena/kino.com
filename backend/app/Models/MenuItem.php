<?php

namespace App\Models;

use App\Models\Concerns\HasPublicUuid;
use App\Observers\MenuItemObserver;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[ObservedBy(MenuItemObserver::class)]
class MenuItem extends Model
{
    use HasFactory, HasPublicUuid, SoftDeletes;

    protected $fillable = [
        'restaurant_id', 'menu_id', 'name', 'description', 'price', 'category',
        'image_url', 'is_available', 'portion_info', 'prep_time_minutes',
        'is_promoted', 'promotion_label', 'is_buffet_only',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'is_available' => 'boolean',
            'is_promoted' => 'boolean',
            'is_buffet_only' => 'boolean',
        ];
    }

    public function restaurant(): BelongsTo
    {
        return $this->belongsTo(Restaurant::class);
    }

    public function menu(): BelongsTo
    {
        return $this->belongsTo(RestaurantMenu::class, 'menu_id');
    }

    public function ingredients(): HasMany
    {
        return $this->hasMany(MenuItemIngredient::class)->orderBy('position');
    }

    /**
     * `order_count`/`is_trending` do mock NÃO são colunas aqui — são
     * calculados on-demand (cache Redis `menu_item:{id}:order_count`, TTL
     * 1h) por App\Services\MenuItemStatsService, nunca persistidos no
     * model, para não ficarem desatualizados sem um job a recalcular.
     */
}
