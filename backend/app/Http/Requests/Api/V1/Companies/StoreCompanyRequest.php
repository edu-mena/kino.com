<?php

namespace App\Http\Requests\Api\V1\Companies;

use Illuminate\Foundation\Http\FormRequest;

class StoreCompanyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'nif' => ['required', 'string', 'max:20'],
            'email' => ['required', 'email', 'max:255'],
        ];
    }
}
