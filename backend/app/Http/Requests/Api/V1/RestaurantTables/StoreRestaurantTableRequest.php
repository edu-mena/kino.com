<?php

namespace App\Http\Requests\Api\V1\RestaurantTables;

use App\Models\RestaurantTable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
            ...self::layoutRules(),
        ];
    }

    /** Partilhado com UpdateRestaurantTableRequest. */
    public static function layoutRules(): array
    {
        return [
            'area' => ['sometimes', 'nullable', 'string', 'max:80'],
            'description' => ['sometimes', 'nullable', 'string', 'max:300'],
            'features' => ['sometimes', 'nullable', 'array', 'max:12'],
            'features.*' => ['string', 'distinct', Rule::in(RestaurantTable::FEATURES)],
            'shape' => ['sometimes', 'string', Rule::in(RestaurantTable::SHAPES)],
            'is_combinable' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
