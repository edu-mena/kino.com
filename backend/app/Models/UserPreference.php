<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserPreference extends Model
{
    protected $primaryKey = 'user_id';

    public $incrementing = false;

    protected $fillable = [
        'user_id', 'dietary_restrictions', 'language', 'notifications_enabled',
        'tutorial_seen_at', 'dietary_onboarding_seen_at',
    ];

    protected function casts(): array
    {
        return [
            'dietary_restrictions' => 'array',
            'notifications_enabled' => 'boolean',
            'tutorial_seen_at' => 'datetime',
            'dietary_onboarding_seen_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
