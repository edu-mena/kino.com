<?php

namespace App\Models;

use App\Models\Concerns\HasPublicUuid;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * Período contínuo com pelo menos um serviço em falha — aberto e fechado
 * sozinho pelo App\Services\Status\StatusMonitor. `internal_error` nunca sai
 * na API pública (só no painel de sistema e no email do operador).
 */
class StatusIncident extends Model
{
    use HasPublicUuid;

    protected $fillable = [
        'components', 'internal_error', 'public_cause', 'started_at', 'last_failure_at',
        'recovering_since', 'users_notified_at', 'resolved_at', 'resolution_notified_at',
    ];

    protected function casts(): array
    {
        return [
            'components' => 'array',
            'started_at' => 'datetime',
            'last_failure_at' => 'datetime',
            'recovering_since' => 'datetime',
            'users_notified_at' => 'datetime',
            'resolved_at' => 'datetime',
            'resolution_notified_at' => 'datetime',
        ];
    }

    public function scopeOpen(Builder $query): Builder
    {
        return $query->whereNull('resolved_at');
    }

    public function publicCause(): string
    {
        return $this->public_cause ?: (string) config('status.default_public_cause');
    }
}
