<?php

namespace App\Http\Requests\Api\V1\Couriers;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Só dados de cadastro — status/atribuição de pedido passam sempre pelas
 * ações dedicadas (setStatus / OrderController::dispatch), nunca por aqui,
 * para não desviar da máquina de estados (ex: "libertar" um estafeta
 * em_entrega sem passar pelo pedido). */
class UpdateCourierRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('manageOperations', $this->route('courier')->restaurant);
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:150'],
            'phone' => ['sometimes', 'string', 'max:30'],
            'vehicle' => ['sometimes', Rule::in(['moto', 'bicicleta', 'carro'])],
            'zone' => ['sometimes', 'nullable', 'string', 'max:100'],
        ];
    }
}
