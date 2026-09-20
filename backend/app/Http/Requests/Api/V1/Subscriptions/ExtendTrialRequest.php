<?php

namespace App\Http\Requests\Api\V1\Subscriptions;

use Illuminate\Foundation\Http\FormRequest;

class ExtendTrialRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isSystemOperator();
    }

    public function rules(): array
    {
        return ['days' => ['required', 'integer', 'min:1', 'max:365']];
    }
}
