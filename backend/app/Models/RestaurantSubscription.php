<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RestaurantSubscription extends Model
{
    protected $primaryKey = 'restaurant_id';

    public $incrementing = false;

    protected $fillable = ['restaurant_id', 'plan', 'started_at', 'trial_ends_at', 'status', 'last_payment_at'];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'trial_ends_at' => 'datetime',
            'last_payment_at' => 'datetime',
        ];
    }

    public function restaurant(): BelongsTo
    {
        return $this->belongsTo(Restaurant::class);
    }

    /** Espelha `computeAccess()` do frontend (src/lib/subscriptions.tsx). */
    public function isLocked(): bool
    {
        return $this->status === 'suspended';
    }

    public function trialDaysLeft(): ?int
    {
        if ($this->status !== 'trial') {
            return null;
        }

        return max(0, now()->diffInDays($this->trial_ends_at, false));
    }
}
