<?php

namespace App\Http\Requests\Api\V1\SiteContent;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSiteFaqRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isSystemOperator();
    }

    public function rules(): array
    {
        return [
            'question' => ['sometimes', 'string', 'max:200'],
            'answer' => ['sometimes', 'string', 'max:1000'],
            'position' => ['sometimes', 'integer', 'min:0'],
        ];
    }
}
