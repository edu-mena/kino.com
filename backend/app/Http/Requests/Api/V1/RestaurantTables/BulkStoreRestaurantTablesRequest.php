<?php

namespace App\Http\Requests\Api\V1\RestaurantTables;

use App\Models\RestaurantTable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** "Criar Mesa 1 a Mesa 12, 4 lugares, Interior" de uma vez — montar a sala
 * pela primeira vez mesa a mesa era o passo mais lento do painel. */
class BulkStoreRestaurantTablesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('manageOperations', $this->route('restaurant'));
    }

    public function rules(): array
    {
        return [
            'prefix' => ['required', 'string', 'max:60'],
            'start' => ['required', 'integer', 'min:0', 'max:9999'],
            'count' => ['required', 'integer', 'min:1', 'max:100'],
            'seats' => ['required', 'integer', 'min:1', 'max:100'],
            'area' => ['sometimes', 'nullable', 'string', 'max:80'],
            'shape' => ['sometimes', 'string', Rule::in(RestaurantTable::SHAPES)],
        ];
    }
}
