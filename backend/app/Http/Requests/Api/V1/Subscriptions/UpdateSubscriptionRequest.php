<?php

namespace App\Http\Requests\Api\V1\Subscriptions;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Billing é assunto interno Luku — nunca editável pelo próprio restaurante,
 * mesmo pelo owner (ver controller: só system_operator). */
class UpdateSubscriptionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isSystemOperator();
    }

    public function rules(): array
    {
        return [
            'status' => ['sometimes', Rule::in(['trial', 'active', 'overdue', 'suspended'])],
            'plan' => ['sometimes', Rule::in(['pro', 'plus'])],
        ];
    }
}
