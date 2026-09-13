<?php

namespace App\Http\Requests\Api\V1\UserPreferences;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserPreferenceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'dietary_restrictions' => ['sometimes', 'array'],
            'dietary_restrictions.*' => ['string', 'max:60'],
            'language' => ['sometimes', 'nullable', Rule::in(['pt', 'en', 'fr'])],
            'notifications_enabled' => ['sometimes', 'boolean'],
        ];
    }
}
