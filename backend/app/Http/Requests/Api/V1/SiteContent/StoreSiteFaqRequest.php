<?php

namespace App\Http\Requests\Api\V1\SiteContent;

use Illuminate\Foundation\Http\FormRequest;

class StoreSiteFaqRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isSystemOperator();
    }

    public function rules(): array
    {
        return [
            'question' => ['required', 'string', 'max:200'],
            'answer' => ['required', 'string', 'max:1000'],
            'position' => ['sometimes', 'integer', 'min:0'],
        ];
    }
}
