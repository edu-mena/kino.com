<?php

namespace App\Http\Requests\Api\V1\PackageTypes;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePackageTypeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isSystemOperator();
    }

    public function rules(): array
    {
        $packageType = $this->route('packageType');

        return [
            'name' => [
                'sometimes', 'string', 'max:80',
                Rule::unique('package_types', 'name')->ignore($packageType->id),
            ],
            'description' => ['sometimes', 'nullable', 'string', 'max:255'],
            'icon' => ['sometimes', 'nullable', 'string', 'max:60'],
            'position' => ['sometimes', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
