<?php

namespace App\Models;

use App\Models\Concerns\HasPublicUuid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/** Mensagem submetida em /contacto — sem painel de leitura próprio por
 * agora (só existe para não perder a mensagem se o envio do email falhar),
 * ver ContactMessageController::store. */
class ContactMessage extends Model
{
    use HasFactory, HasPublicUuid;

    protected $fillable = ['name', 'email', 'subject', 'message'];
}
