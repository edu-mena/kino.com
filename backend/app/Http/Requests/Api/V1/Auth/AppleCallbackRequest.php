<?php

namespace App\Http\Requests\Api\V1\Auth;

use Illuminate\Foundation\Http\FormRequest;

/** Login com Apple (AuthController::appleCallback) — o nome só vem da Apple
 * no PRIMEIRO login, por isso chega à parte (given_name/family_name). */
class AppleCallbackRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id_token' => ['required', 'string', 'max:4096'],
            'authorization_code' => ['sometimes', 'nullable', 'string', 'max:512'],
            'nonce' => ['sometimes', 'nullable', 'string', 'max:128'],
            'given_name' => ['sometimes', 'nullable', 'string', 'max:100'],
            'family_name' => ['sometimes', 'nullable', 'string', 'max:100'],
            'device_name' => ['sometimes', 'string', 'max:120'],
        ];
    }
}
