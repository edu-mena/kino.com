<?php

namespace App\Models;

use App\Models\Concerns\HasPublicUuid;
use App\Observers\ReservationObserver;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

#[ObservedBy(ReservationObserver::class)]
class Reservation extends Model
{
    use HasFactory, HasPublicUuid;

    protected $fillable = [
        'restaurant_id', 'user_id', 'guest_token', 'customer_name',
        'customer_phone', 'customer_email', 'date', 'time', 'people_count',
        'caution_amount', 'caution_status', 'status', 'status_updated_at',
        'table_id', 'special_requests',
        'payment_proof_url', 'payment_proof_at',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'caution_amount' => 'decimal:2',
            'status_updated_at' => 'datetime',
            'payment_proof_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $reservation) {
            if (empty($reservation->user_id) && empty($reservation->guest_token)) {
                $reservation->guest_token = (string) Str::uuid();
            }
        });
    }

    public function restaurant(): BelongsTo
    {
        return $this->belongsTo(Restaurant::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function table(): BelongsTo
    {
        return $this->belongsTo(RestaurantTable::class, 'table_id');
    }
}
