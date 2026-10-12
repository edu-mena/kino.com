<?php

namespace App\Http\Requests\Api\V1\TableCombinations;

use App\Models\Restaurant;
use App\Models\RestaurantTable;
use App\Models\TableCombination;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreTableCombinationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('manageOperations', $this->restaurant());
    }

    public function rules(): array
    {
        return [
            'date' => ['required', 'date_format:Y-m-d'],
            ...self::tableRules($this->restaurant(), required: true),
            'seats' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:500'],
            'label' => ['sometimes', 'nullable', 'string', 'max:80'],
        ];
    }

    public function after(): array
    {
        return [
            fn (Validator $validator) => self::checkTables(
                $validator,
                $this->restaurant(),
                $this->input('table_ids', []),
                (string) $this->input('date'),
                null,
            ),
        ];
    }

    protected function restaurant(): Restaurant
    {
        return $this->route('restaurant');
    }

    public static function tableRules(Restaurant $restaurant, bool $required): array
    {
        return [
            'table_ids' => [$required ? 'required' : 'sometimes', 'array', 'min:2', 'max:20'],
            'table_ids.*' => [
                'string', 'distinct',
                Rule::exists('restaurant_tables', 'uuid')->where('restaurant_id', $restaurant->id),
            ],
        ];
    }

    /**
     * Regras que não cabem numa rule simples: só mesas em serviço e que
     * podem ser juntas, e nenhuma já noutra junção nesse dia (a BD também o
     * garante — unique(restaurant_table_id, date) — isto só dá a mensagem
     * certa em vez de um 500).
     *
     * @param  array<int, string>  $uuids
     */
    public static function checkTables(
        Validator $validator,
        Restaurant $restaurant,
        mixed $uuids,
        string $date,
        ?TableCombination $ignore,
    ): void {
        if ($validator->errors()->isNotEmpty() || ! is_array($uuids) || $uuids === []) {
            return;
        }

        $tables = $restaurant->tables()->whereIn('uuid', $uuids)->get();

        $blocked = $tables->filter(fn (RestaurantTable $t) => ! $t->is_active || ! $t->is_combinable);
        if ($blocked->isNotEmpty()) {
            $validator->errors()->add(
                'table_ids',
                'Estas mesas não podem ser juntas: '.$blocked->pluck('name')->join(', ').'.',
            );

            return;
        }

        $taken = DB::table('table_combination_table')
            ->join('restaurant_tables', 'restaurant_tables.id', '=', 'table_combination_table.restaurant_table_id')
            ->whereIn('restaurant_table_id', $tables->pluck('id'))
            ->whereDate('table_combination_table.date', $date)
            ->when($ignore, fn ($q) => $q->where('table_combination_id', '!=', $ignore->id))
            ->pluck('restaurant_tables.name');

        if ($taken->isNotEmpty()) {
            $validator->errors()->add(
                'table_ids',
                'Já estão juntas a outras mesas neste dia: '.$taken->join(', ').'.',
            );
        }
    }
}
