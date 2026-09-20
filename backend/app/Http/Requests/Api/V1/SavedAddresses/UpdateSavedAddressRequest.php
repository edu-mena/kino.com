<?php

namespace App\Http\Requests\Api\V1\SavedAddresses;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSavedAddressRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->route('savedAddress')->user_id === $this->user()?->id;
    }

    public function rules(): array
    {
        return [
            'label' => ['sometimes', 'nullable', 'string', 'max:80'],
            'line1' => ['sometimes', 'string', 'max:255'],
            'line2' => ['sometimes', 'nullable', 'string', 'max:255'],
            'is_default' => ['sometimes', 'boolean'],
            'lat' => ['sometimes', 'nullable', 'numeric', 'between:-90,90'],
            'lng' => ['sometimes', 'nullable', 'numeric', 'between:-180,180'],
        ];
    }
}
