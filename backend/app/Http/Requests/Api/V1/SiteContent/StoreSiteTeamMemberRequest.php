<?php

namespace App\Http\Requests\Api\V1\SiteContent;

use Illuminate\Foundation\Http\FormRequest;

class StoreSiteTeamMemberRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isSystemOperator();
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100'],
            'role' => ['required', 'string', 'max:100'],
            'initials' => ['sometimes', 'nullable', 'string', 'max:4'],
            // URL já carregada via POST /uploads (purpose=site, ver
            // ImageUploadField) — nunca um ficheiro aqui (mesmo padrão de
            // UpdateRestaurantRequest::cover_image_url).
            'photo_url' => ['sometimes', 'nullable', 'string', 'max:2048'],
            'position' => ['sometimes', 'integer', 'min:0'],
        ];
    }
}
