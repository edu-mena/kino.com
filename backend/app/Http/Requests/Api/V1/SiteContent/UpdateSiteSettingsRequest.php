<?php

namespace App\Http\Requests\Api\V1\SiteContent;

use Illuminate\Foundation\Http\FormRequest;

/** Contacto + texto/media da página "Sobre nós" — catálogo institucional da
 * plataforma, só system_operator gere (ver plano, /sistema/conteudo). */
class UpdateSiteSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isSystemOperator();
    }

    public function rules(): array
    {
        return [
            'contact_email' => ['sometimes', 'nullable', 'email', 'max:150'],
            'contact_phone' => ['sometimes', 'nullable', 'string', 'max:40'],
            'contact_address' => ['sometimes', 'nullable', 'string', 'max:150'],
            'contact_whatsapp' => ['sometimes', 'nullable', 'string', 'max:40'],
            'about_eyebrow' => ['sometimes', 'nullable', 'string', 'max:80'],
            'about_title' => ['sometimes', 'nullable', 'string', 'max:150'],
            'about_description' => ['sometimes', 'nullable', 'string', 'max:600'],
            'hero_media' => ['sometimes', 'nullable', 'file', 'mimes:jpg,jpeg,png,webp,mp4,mov,webm', 'max:102400'],
        ];
    }
}
