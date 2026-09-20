<?php

namespace App\Http\Requests\Api\V1\Couriers;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCourierRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('manageOperations', $this->route('restaurant'));
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'phone' => ['required', 'string', 'max:30'],
            'vehicle' => ['required', Rule::in(['moto', 'bicicleta', 'carro'])],
            'zone' => ['sometimes', 'nullable', 'string', 'max:100'],
        ];
    }
}
