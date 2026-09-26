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
        ];
    }
}
