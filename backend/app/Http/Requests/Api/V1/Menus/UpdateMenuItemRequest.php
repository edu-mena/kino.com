<?php

namespace App\Http\Requests\Api\V1\Menus;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMenuItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('menuItem')->restaurant);
    }

    public function rules(): array
    {
        return [
            // Valida pelo `uuid` — ver StoreMenuItemRequest.
            'menu_id' => [
                'sometimes', 'string',
                Rule::exists('restaurant_menus', 'uuid')->where('restaurant_id', $this->route('menuItem')->restaurant_id),
            ],
            'name' => ['sometimes', 'string', 'max:150'],
            'description' => ['sometimes', 'nullable', 'string'],
            'price' => ['sometimes', 'nullable', 'required_unless:is_buffet_only,true', 'numeric', 'min:0'],
            'is_buffet_only' => ['sometimes', 'boolean'],
            'category' => ['sometimes', 'string', 'max:80'],
            'image_url' => ['sometimes', 'nullable', 'string', 'max:2048'],
            'is_available' => ['sometimes', 'boolean'],
            'portion_info' => ['sometimes', 'nullable', 'string', 'max:120'],
            'prep_time_minutes' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'is_promoted' => ['sometimes', 'boolean'],
            'promotion_label' => ['sometimes', 'nullable', 'string', 'max:80'],
            'ingredients' => ['sometimes', 'array'],
            'ingredients.*.name' => ['required_with:ingredients', 'string', 'max:80'],
            'ingredients.*.removable' => ['sometimes', 'boolean'],
            'ingredients.*.extra_price' => ['nullable', 'numeric', 'min:0'],
        ];
    }
}
