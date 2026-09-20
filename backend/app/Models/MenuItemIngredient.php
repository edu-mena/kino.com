<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MenuItemIngredient extends Model
{
    public $timestamps = false;

    protected $fillable = ['menu_item_id', 'name', 'removable', 'extra_price', 'position'];

    protected function casts(): array
    {
        return [
            'removable' => 'boolean',
            'extra_price' => 'decimal:2',
        ];
    }

    public function menuItem(): BelongsTo
    {
        return $this->belongsTo(MenuItem::class);
    }
}
