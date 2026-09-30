<?php

namespace App\Models;

use App\Models\Concerns\HasPublicUuid;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\MassPrunable;
use Illuminate\Database\Eloquent\Model;

/** Mensagem submetida em /contacto — sem painel de leitura próprio por
 * agora (só existe para não perder a mensagem se o envio do email falhar),
 * ver ContactMessageController::store. */
class ContactMessage extends Model
{
    use HasFactory, HasPublicUuid, MassPrunable;

    protected $fillable = ['name', 'email', 'subject', 'message'];

    /*
     * Retenção de dados (auditoria de segurança, Fase 3 / Lei n.º 22/11 —
     * não guardar dados pessoais mais tempo do que o necessário). Corre no
     * `model:prune` diário (routes/console.php).
     */
    public function prunable(): Builder
    {
        return static::query()->where('created_at', '<', now()->subMonths(12));
    }
}
