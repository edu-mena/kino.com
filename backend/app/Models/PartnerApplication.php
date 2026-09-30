<?php

namespace App\Models;

use App\Models\Concerns\HasPublicUuid;
use App\Services\MediaUploadService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Prunable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PartnerApplication extends Model
{
    use HasFactory, HasPublicUuid, Prunable;

    protected $fillable = [
        'restaurant_name', 'owner_name', 'phone', 'email', 'province',
        'lat', 'lng', 'message', 'photo_url', 'status', 'created_restaurant_id',
    ];

    public function createdRestaurant(): BelongsTo
    {
        return $this->belongsTo(Restaurant::class, 'created_restaurant_id');
    }

    /*
     * Retenção de dados (auditoria de segurança, Fase 3 / Lei n.º 22/11 —
     * não guardar dados pessoais mais tempo do que o necessário). Corre no
     * `model:prune` diário (routes/console.php).
     */
    public function prunable(): Builder
    {
        // Só as recusadas — uma aprovada é a origem do restaurante.
        return static::query()->where('status', 'rejected')->where('updated_at', '<', now()->subMonths(6));
    }

    /** Prunable (não Mass): a foto enviada na candidatura vive no bucket
     * público e tem de sair com ela. */
    protected function pruning(): void
    {
        app(MediaUploadService::class)->deleteByUrl($this->photo_url);
    }
}
