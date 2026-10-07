<?php

namespace App\Http\Resources\Api\V1;

use App\Models\SiteSetting;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin SiteSetting */
class SiteSettingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'contactEmail' => $this->contact_email,
            'contactPhone' => $this->contact_phone,
            'contactAddress' => $this->contact_address,
            'contactWhatsapp' => $this->contact_whatsapp,
            'aboutEyebrow' => $this->about_eyebrow,
            'aboutTitle' => $this->about_title,
            'aboutDescription' => $this->about_description,
            'aboutHeroImageUrl' => $this->about_hero_image_url,
            'aboutHeroMediaType' => $this->about_hero_media_type,
            'aboutHeroThumbnailUrl' => $this->about_hero_thumbnail_url,
            'processingStatus' => $this->processing_status,
            // Páginas para visitantes: textos/imagens que substituem os
            // originais (por chave de tradução). `(object)`: um mapa vazio
            // sai `{}`, nunca `[]`.
            'guestContent' => [
                'texts' => (object) ($this->guest_content['texts'] ?? []),
                'media' => (object) ($this->guest_content['media'] ?? []),
            ],
            'lukuVideoUrl' => $this->luku_video_url,
            'lukuVideoPosterUrl' => $this->luku_video_poster_url,
            'lukuVideoStatus' => $this->luku_video_status ?? 'ready',
        ];
    }
}
