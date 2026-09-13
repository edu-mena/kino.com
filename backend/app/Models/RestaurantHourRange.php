<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RestaurantHourRange extends Model
{
    protected $fillable = ['restaurant_hours_id', 'start_time', 'end_time'];

    public $timestamps = false;

    public function restaurantHour(): BelongsTo
    {
        return $this->belongsTo(RestaurantHour::class, 'restaurant_hours_id');
    }
}
