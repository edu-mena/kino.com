<?php

namespace App\Models;

use App\Models\Concerns\HasPublicUuid;
use App\Observers\NotificationObserver;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\MassPrunable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Notificação persistida (não é o `DatabaseNotification` padrão do Laravel —
 * schema próprio e mais simples, ver plano). Gerada por Observers em
 * Order/Reservation, nunca por diffing client-side.
 */
#[ObservedBy(NotificationObserver::class)]
class Notification extends Model
{
    use HasFactory, HasPublicUuid, MassPrunable;

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

    /**
     * `status_snapshot` guarda um JSON compacto desde a Fase N1 (ex.
     * `{"status": "pending", "itemCount": 3, "total": 12500}`) — mas
     * notificações antigas (e as de seguidor, `followPriceChange`/
     * `followInvite`) continuam a guardar só um valor simples ("pending",
     * "3", ""). `json_decode` de um valor simples nunca devolve um array
     * (string inválida → null; número → int/float) — por isso um `null` aqui
     * significa sempre "sem contexto extra", nunca um erro a tratar.
     *
     * @return array<string, mixed>|null
     */
    public function snapshot(): ?array
    {
        $decoded = json_decode((string) $this->status_snapshot, true);

        return is_array($decoded) ? $decoded : null;
    }

    /** Estado bruto, sempre disponível — do snapshot decodificado quando
     * existe, senão o valor legado guardado diretamente na coluna. */
    public function statusValue(): string
    {
        return (string) ($this->snapshot()['status'] ?? $this->status_snapshot);
    }

    /*
     * Retenção de dados (auditoria de segurança, Fase 3 / Lei n.º 22/11 —
     * não guardar dados pessoais mais tempo do que o necessário). Corre no
     * `model:prune` diário (routes/console.php).
     */
    public function prunable(): Builder
    {
        // Lidas: 6 meses. Nunca lidas: 12 (ninguém volta a elas depois disso).
        return static::query()->where(fn ($q) => $q
            ->where(fn ($q) => $q->whereNotNull('read_at')->where('created_at', '<', now()->subMonths(6)))
            ->orWhere('created_at', '<', now()->subMonths(12)));
    }
}
