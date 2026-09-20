<?php

namespace App\Http\Requests\Api\V1\Menus;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMenuItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('restaurant'));
    }

    public function rules(): array
    {
        return [
            // Garante que o menu pertence a ESTE restaurante — sem isto, um
            // staff podia associar o prato ao cardápio de outro restaurante
            // (cross-tenant), mesmo sem conseguir editá-lo diretamente.
            'menu_id' => [
                'required', 'integer',
                Rule::exists('restaurant_menus', 'id')->where('restaurant_id', $this->route('restaurant')->id),
            ],
            'name' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string'],
            'price' => ['required', 'numeric', 'min:0'],
            'category' => ['required', 'string', 'max:80'],
            'image_url' => ['nullable', 'string', 'max:2048'],
            'is_available' => ['sometimes', 'boolean'],
            'portion_info' => ['nullable', 'string', 'max:120'],
            'prep_time_minutes' => ['nullable', 'integer', 'min:0'],
            'is_promoted' => ['sometimes', 'boolean'],
            'promotion_label' => ['nullable', 'string', 'max:80'],
            'ingredients' => ['sometimes', 'array'],
            'ingredients.*.name' => ['required_with:ingredients', 'string', 'max:80'],
            'ingredients.*.removable' => ['sometimes', 'boolean'],
            'ingredients.*.extra_price' => ['nullable', 'numeric', 'min:0'],
        ];
    }
}
