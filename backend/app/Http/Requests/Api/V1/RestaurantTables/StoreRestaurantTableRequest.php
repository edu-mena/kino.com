<?php

namespace App\Http\Requests\Api\V1\RestaurantTables;

use Illuminate\Foundation\Http\FormRequest;

class StoreRestaurantTableRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('manageOperations', $this->route('restaurant'));
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:80'],
            'seats' => ['required', 'integer', 'min:1', 'max:100'],
            'area' => ['sometimes', 'nullable', 'string', 'max:80'],
        ];
    }
}
