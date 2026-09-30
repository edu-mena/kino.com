<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\MassPrunable;
use Illuminate\Database\Eloquent\Model;

/** Ver App\Http\Middleware\EnsureIdempotency — registo de respostas para
 * POST orders/reservations, para retries de cliente não duplicarem. */
class IdempotencyKey extends Model
{
    use MassPrunable;

    protected $fillable = ['owner_key', 'idempotency_key', 'endpoint', 'response_status', 'response_body'];

    protected function casts(): array
    {
        return ['response_body' => 'array'];
    }

    /*
     * Retenção de dados (auditoria de segurança, Fase 3 / Lei n.º 22/11 —
     * não guardar dados pessoais mais tempo do que o necessário). Corre no
     * `model:prune` diário (routes/console.php).
     */
    public function prunable(): Builder
    {
        // Só serve para repetir a resposta de um retry do mesmo pedido —
        // 48h cobrem qualquer retry real (e o corpo guardado tem PII).
        return static::query()->where('created_at', '<', now()->subHours(48));
    }
}
