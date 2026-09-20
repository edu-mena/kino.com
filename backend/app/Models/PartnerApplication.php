<?php

namespace App\Models;

use App\Models\Concerns\HasPublicUuid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PartnerApplication extends Model
{
    use HasFactory, HasPublicUuid;

    protected $fillable = [
        'restaurant_name', 'owner_name', 'phone', 'email', 'province',
        'message', 'photo_url', 'status', 'created_restaurant_id',
    ];

    public function createdRestaurant(): BelongsTo
    {
        return $this->belongsTo(Restaurant::class, 'created_restaurant_id');
    }
}
