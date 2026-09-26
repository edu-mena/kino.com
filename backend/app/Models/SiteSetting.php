<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Singleton (id=1) — informação de contacto + texto/media da página
 * "Sobre nós", editável em /sistema/conteudo. Ver DeliveryPolicy para o
 * mesmo padrão. `firstOrCreate` em vez de `findOrFail(1)`: ao contrário da
 * DeliveryPolicy, este model tem um GET público (show da página /sobre e
 * /contacto) — nunca pode 500 só porque o seeder ainda não correu. */
class SiteSetting extends Model
{
    protected $fillable = [
        'id', 'contact_email', 'contact_phone', 'contact_address', 'contact_whatsapp',
        'about_eyebrow', 'about_title', 'about_description',
        'about_hero_image_url', 'about_hero_media_type', 'about_hero_thumbnail_url',
        'processing_status',
    ];

    public static function current(): self
    {
        return static::query()->firstOrCreate(['id' => 1]);
    }
}
