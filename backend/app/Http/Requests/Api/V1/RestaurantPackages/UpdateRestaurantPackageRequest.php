<?php

namespace App\Http\Requests\Api\V1\RestaurantPackages;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRestaurantPackageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('manageOperations', $this->route('restaurantPackage')->restaurant);
    }

    public function rules(): array
    {
        return [
            'package_type_id' => [
                'sometimes', 'string',
                Rule::exists('package_types', 'uuid')->where('is_active', true),
            ],
            'title' => ['sometimes', 'nullable', 'string', 'max:120'],
            'description' => ['sometimes', 'nullable', 'string', 'max:500'],
            'price' => ['sometimes', 'numeric', 'min:0'],
            'max_people' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'characteristics' => ['sometimes', 'array'],
            'characteristics.*' => ['string', 'max:80'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
