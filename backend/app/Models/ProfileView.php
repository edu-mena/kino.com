<?php

namespace App\Models;

use App\Models\Concerns\HasPublicUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Visitante único do perfil público de um restaurante (ver migration). */
class ProfileView extends Model
{
    use HasPublicUuid;

    /** Sem retorno dentro desta janela = mesma visita. */
    public const SESSION_WINDOW_MINUTES = 30;

    protected $fillable = [
        'restaurant_id', 'user_id', 'viewer_key', 'visits', 'first_at', 'last_at',
    ];

    protected function casts(): array
    {
        return [
            'first_at' => 'datetime',
            'last_at' => 'datetime',
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
