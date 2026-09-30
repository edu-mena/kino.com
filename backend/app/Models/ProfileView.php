<?php

namespace App\Models;

use App\Models\Concerns\HasPublicUuid;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\MassPrunable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Visitante único do perfil público de um restaurante (ver migration). */
class ProfileView extends Model
{
    use HasPublicUuid, MassPrunable;

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

    /*
     * Retenção de dados (auditoria de segurança, Fase 3 / Lei n.º 22/11 —
     * não guardar dados pessoais mais tempo do que o necessário). Corre no
     * `model:prune` diário (routes/console.php).
     */
    public function prunable(): Builder
    {
        // "Quem viu o seu perfil" mostra no máximo as últimas semanas.
        return static::query()->where('last_at', '<', now()->subDays(90));
    }
}
