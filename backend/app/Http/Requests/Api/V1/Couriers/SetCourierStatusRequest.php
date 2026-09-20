<?php

namespace App\Http\Requests\Api\V1\Couriers;

use Illuminate\Contracts\Validation\Validator as ValidatorContract;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Só disponível<->offline (ver mock, `setStatus`) — nunca "em_entrega"
 * diretamente, isso só nasce de OrderController::dispatch. */
class SetCourierStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('manageOperations', $this->route('courier')->restaurant);
    }

    public function rules(): array
    {
        return ['status' => ['required', Rule::in(['disponivel', 'offline'])]];
    }

    public function withValidator(ValidatorContract $validator): void
    {
        $validator->after(function (ValidatorContract $validator) {
            // Mesma regra do mock: um estafeta em entrega não pode ser
            // posto offline (nem "disponível" à força) por aqui.
            if ($this->route('courier')->status === 'em_entrega') {
                $validator->errors()->add('status', 'Este estafeta está em entrega — não pode mudar de estado agora.');
            }
        });
    }
}
