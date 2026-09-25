<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Estado do último convite "siga-nos" de um restaurante a um cliente —
 * regras em App\Services\FollowInvitePolicy. */
class FollowInvite extends Model
{
    protected $fillable = [
        'restaurant_id', 'user_id', 'last_sent_at', 'declined_at', 'muted_at', 'accepted_at',
    ];

    protected function casts(): array
    {
        return [
            'last_sent_at' => 'datetime',
            'declined_at' => 'datetime',
            'muted_at' => 'datetime',
            'accepted_at' => 'datetime',
        ];
    }

    public function restaurant(): BelongsTo
    {
        return $this->belongsTo(Restaurant::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
