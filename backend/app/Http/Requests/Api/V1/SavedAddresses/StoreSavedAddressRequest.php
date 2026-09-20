<?php

namespace App\Http\Requests\Api\V1\SavedAddresses;

use Illuminate\Foundation\Http\FormRequest;

class StoreSavedAddressRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            // NOT NULL na BD (ver migration) — sem rótulo, o cliente não
            // consegue distinguir "Casa" de "Trabalho" na lista.
            'label' => ['required', 'string', 'max:80'],
            'line1' => ['required', 'string', 'max:255'],
            'line2' => ['sometimes', 'nullable', 'string', 'max:255'],
            'is_default' => ['sometimes', 'boolean'],
            'lat' => ['sometimes', 'nullable', 'numeric', 'between:-90,90'],
            'lng' => ['sometimes', 'nullable', 'numeric', 'between:-180,180'],
        ];
    }
}
