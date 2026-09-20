<?php

namespace App\Http\Requests\Api\V1\ContactMessages;

use Illuminate\Foundation\Http\FormRequest;

/** Formulário público de /contacto — qualquer um pode enviar, sem conta
 * nenhuma (mesmo padrão de StorePartnerApplicationRequest). */
class StoreContactMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:150'],
            'subject' => ['required', 'string', 'max:150'],
            'message' => ['required', 'string', 'max:2000'],
        ];
    }
}
