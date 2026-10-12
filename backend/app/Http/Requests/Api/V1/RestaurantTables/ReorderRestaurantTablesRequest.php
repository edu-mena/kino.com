<?php

namespace App\Http\Requests\Api\V1\RestaurantTables;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Ordem manual da sala — lista de uuids, a 1.ª fica primeiro. Mesas do
 * restaurante que não vierem na lista mantêm-se, depois das listadas. */
class ReorderRestaurantTablesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('manageOperations', $this->route('restaurant'));
    }

    public function rules(): array
    {
        return [
            'ids' => ['required', 'array', 'min:1', 'max:500'],
            'ids.*' => [
                'string', 'distinct',
                Rule::exists('restaurant_tables', 'uuid')->where('restaurant_id', $this->route('restaurant')->id),
            ],
        ];
    }
}
