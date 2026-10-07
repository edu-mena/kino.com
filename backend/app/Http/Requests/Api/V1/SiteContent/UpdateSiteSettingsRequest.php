<?php

namespace App\Http\Requests\Api\V1\SiteContent;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/** Contacto + texto/media da página "Sobre nós" + páginas para visitantes —
 * catálogo institucional da plataforma, só system_operator gere (ver plano,
 * /sistema/conteudo). */
class UpdateSiteSettingsRequest extends FormRequest
{
    /** Chave de tradução (`luku.bentoTitle`) — o único formato aceite para
     * os textos/imagens de `guest_content`. */
    private const CONTENT_KEY = '/^[a-zA-Z]+\.[a-zA-Z0-9]+$/';

    public function authorize(): bool
    {
        return $this->user()->isSystemOperator();
    }

    /** O pedido é multipart (pode levar ficheiros), por isso `guest_content`
     * chega como JSON em texto — descodificado aqui antes de validar. */
    protected function prepareForValidation(): void
    {
        $raw = $this->input('guest_content');
        if (is_string($raw)) {
            $decoded = json_decode($raw, true);
            $this->merge(['guest_content' => is_array($decoded) ? $decoded : 'invalid']);
        }
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
            // Textos/imagens das páginas para visitantes — parcial: só as
            // chaves enviadas mudam; texto vazio volta ao original.
            'guest_content' => ['sometimes', 'array'],
            'guest_content.texts' => ['sometimes', 'array', 'max:200'],
            'guest_content.texts.*' => ['nullable', 'string', 'max:600'],
            'guest_content.media' => ['sometimes', 'array', 'max:40'],
            'guest_content.media.*' => ['nullable', 'string', 'url:http,https', 'max:2048'],
            'luku_video' => ['sometimes', 'nullable', 'file', 'mimes:mp4,mov,webm', 'max:102400'],
            'luku_video_reset' => ['sometimes', 'boolean'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                $content = $this->input('guest_content');
                if (! is_array($content)) {
                    return;
                }
                foreach (['texts', 'media'] as $group) {
                    foreach (array_keys((array) ($content[$group] ?? [])) as $key) {
                        if (! is_string($key) || ! preg_match(self::CONTENT_KEY, $key)) {
                            $validator->errors()->add("guest_content.{$group}", 'invalid_key');
                        }
                    }
                }
            },
        ];
    }
}
