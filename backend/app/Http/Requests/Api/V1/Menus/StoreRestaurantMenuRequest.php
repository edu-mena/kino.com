<?php

namespace App\Http\Requests\Api\V1\Menus;

use Illuminate\Foundation\Http\FormRequest;

class StoreRestaurantMenuRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('restaurant'));
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'is_active' => ['sometimes', 'boolean'],
            'category' => ['nullable', 'string', 'max:80'],
        ];
    }
}
