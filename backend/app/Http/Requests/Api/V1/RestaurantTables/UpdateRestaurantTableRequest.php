<?php

namespace App\Http\Requests\Api\V1\RestaurantTables;

use Illuminate\Foundation\Http\FormRequest;

class UpdateRestaurantTableRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('manageOperations', $this->route('table')->restaurant);
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:80'],
            'seats' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'area' => ['sometimes', 'nullable', 'string', 'max:80'],
        ];
    }
}
