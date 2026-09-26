<?php

namespace App\Http\Requests\Api\V1\SiteContent;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSiteTestimonialRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isSystemOperator();
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:100'],
            'role' => ['sometimes', 'string', 'max:100'],
            'quote' => ['sometimes', 'string', 'max:600'],
            'initials' => ['sometimes', 'nullable', 'string', 'max:4'],
            'photo_url' => ['sometimes', 'nullable', 'string', 'max:2048'],
            'position' => ['sometimes', 'integer', 'min:0'],
        ];
    }
}
