<?php

namespace App\Models;

use App\Models\Concerns\HasPublicUuid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Notificação persistida (não é o `DatabaseNotification` padrão do Laravel —
 * schema próprio e mais simples, ver plano). Gerada por Observers em
 * Order/Reservation, nunca por diffing client-side.
 */
class Notification extends Model
{
    use HasFactory, HasPublicUuid;

    protected $table = 'notifications';

    protected $fillable = [
        'user_id', 'restaurant_id', 'kind', 'ref_id', 'event', 'status_snapshot', 'read_at',
    ];

    protected function casts(): array
    {
        return [
            'read_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function restaurant(): BelongsTo
    {
        return $this->belongsTo(Restaurant::class);
    }
}
