<?php

namespace App\Http\Requests\Api\V1\Menus;

use Illuminate\Foundation\Http\FormRequest;

class UpdateRestaurantMenuRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('menu')->restaurant);
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:120'],
            'is_active' => ['sometimes', 'boolean'],
            'category' => ['sometimes', 'nullable', 'string', 'max:80'],
        ];
    }
}
