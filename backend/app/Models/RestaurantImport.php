<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Origem de um restaurante pré-cadastrado (hoje só `menus_ao`). Os
 * contactos recolhidos ficam AQUI, não no restaurante: são só para a equipa
 * Luku o contactar; o que fica público decide-se ao ativar.
 */
class RestaurantImport extends Model
{
    public const SOURCE_MENUS_AO = 'menus_ao';

    protected $fillable = [
        'restaurant_id', 'source', 'source_slug', 'source_url', 'contact_phone',
        'contact_email', 'source_location', 'stats', 'synced_at', 'activated_at', 'discarded_at',
    ];

    protected function casts(): array
    {
        return [
            'stats' => 'array',
            'synced_at' => 'datetime',
            'activated_at' => 'datetime',
            'discarded_at' => 'datetime',
        ];
    }

    public function restaurant(): BelongsTo
    {
        return $this->belongsTo(Restaurant::class)->withTrashed();
    }
}
