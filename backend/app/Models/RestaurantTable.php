<?php

namespace App\Models;

use App\Models\Concerns\HasPublicUuid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class RestaurantTable extends Model
{
    use HasFactory, HasPublicUuid;

    /** Formas da planta da sala. */
    public const SHAPES = ['square', 'round', 'rectangle', 'booth', 'high'];

    /** Características pré-definidas (chips no painel). O texto livre fica
     * em `description`. */
    public const FEATURES = [
        'fixed_seats', 'sofa', 'window', 'outdoor', 'accessible',
        'baby_chair', 'power_outlet', 'private', 'view', 'quiet', 'smoking',
    ];

    protected $table = 'restaurant_tables';

    protected $fillable = [
        'restaurant_id', 'name', 'seats', 'area', 'description', 'features',
        'shape', 'is_combinable', 'is_active', 'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'features' => 'array',
            'is_combinable' => 'boolean',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        // Toda a mesa nasce com o seu QR — o painel nunca tem de "gerar"
        // nada antes de imprimir.
        static::created(fn (self $table) => QrCode::forTable($table));
    }

    public function restaurant(): BelongsTo
    {
        return $this->belongsTo(Restaurant::class);
    }

    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class, 'table_id');
    }

    public function combinations(): BelongsToMany
    {
        return $this->belongsToMany(TableCombination::class, 'table_combination_table')
            ->withPivot(['date', 'position']);
    }

    public function qrCode(): HasOne
    {
        return $this->hasOne(QrCode::class, 'restaurant_table_id');
    }
}
