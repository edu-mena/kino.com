<?php

namespace App\Http\Requests\Api\V1\PartnerApplications;

use Illuminate\Foundation\Http\FormRequest;

/** Formulário público de /parceiros — qualquer um pode candidatar-se, sem
 * conta nenhuma (é precisamente como se cria uma). */
class StorePartnerApplicationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'restaurant_name' => ['required', 'string', 'max:150'],
            'owner_name' => ['required', 'string', 'max:150'],
            'phone' => ['required', 'string', 'max:30'],
            'email' => ['required', 'email', 'max:150'],
            'province' => ['sometimes', 'nullable', 'string', 'max:100'],
            'message' => ['sometimes', 'nullable', 'string', 'max:1000'],
            // Foto do restaurante escolhida no passo 1 do formulário — vira
            // a imagem de capa do restaurante, se a candidatura for
            // aprovada (ver ApprovePartnerApplication). Opcional: nem todo
            // candidato tem uma foto à mão nesse momento.
            'photo' => ['sometimes', 'nullable', 'image', 'max:8192'],
        ];
    }
}
