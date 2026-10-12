<?php

namespace App\Http\Requests\Api\V1\TableCombinations;

use App\Models\TableCombination;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/** A data de uma junção não muda — para outro dia, cria-se outra. */
class UpdateTableCombinationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('manageOperations', $this->combination()->restaurant);
    }

    public function rules(): array
    {
        return [
            ...StoreTableCombinationRequest::tableRules($this->combination()->restaurant, required: false),
            'seats' => ['sometimes', 'integer', 'min:1', 'max:500'],
            'label' => ['sometimes', 'nullable', 'string', 'max:80'],
        ];
    }

    public function after(): array
    {
        if (! $this->has('table_ids')) {
            return [];
        }

        return [
            fn (Validator $validator) => StoreTableCombinationRequest::checkTables(
                $validator,
                $this->combination()->restaurant,
                $this->input('table_ids', []),
                $this->combination()->date->toDateString(),
                $this->combination(),
            ),
        ];
    }

    private function combination(): TableCombination
    {
        return $this->route('combination');
    }
}
