<?php

namespace App\Http\Requests\Api\V1\PackageTypes;

use Illuminate\Foundation\Http\FormRequest;

/** Tipo de pacote é catálogo da plataforma, não de um restaurante — só
 * system_operator gere (ver plano, `/sistema/pacotes`). */
class StorePackageTypeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isSystemOperator();
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:80', 'unique:package_types,name'],
            'description' => ['sometimes', 'nullable', 'string', 'max:255'],
            'icon' => ['sometimes', 'nullable', 'string', 'max:60'],
            'position' => ['sometimes', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
