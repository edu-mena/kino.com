<?php

namespace App\Http\Requests\Api\V1\SiteContent;

use Illuminate\Foundation\Http\FormRequest;

class StoreSiteTestimonialRequest extends FormRequest
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
            'quote' => ['required', 'string', 'max:600'],
            'initials' => ['sometimes', 'nullable', 'string', 'max:4'],
            'photo_url' => ['sometimes', 'nullable', 'string', 'max:2048'],
            'position' => ['sometimes', 'integer', 'min:0'],
        ];
    }
}
