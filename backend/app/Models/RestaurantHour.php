<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RestaurantHour extends Model
{
    public $timestamps = false; // tabela sem created_at/updated_at (ver migration)

    protected $fillable = ['restaurant_id', 'weekday', 'is_open'];

    protected function casts(): array
    {
        return ['is_open' => 'boolean'];
    }

    public function restaurant(): BelongsTo
    {
        return $this->belongsTo(Restaurant::class);
    }

    public function ranges(): HasMany
    {
        return $this->hasMany(RestaurantHourRange::class, 'restaurant_hours_id');
    }
}
