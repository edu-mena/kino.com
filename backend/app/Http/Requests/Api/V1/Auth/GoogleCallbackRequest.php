<?php

namespace App\Http\Requests\Api\V1\Auth;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Aceita dois shapes (ver plano, secção Autenticação):
 *  - Web (authorization-code flow, popup GIS): {code} — `redirect_uri` NÃO
 *    vem do cliente; o servidor usa sempre 'postmessage' (fixo, exigido
 *    pelo Google para este modo — ver GoogleOAuthService), nunca confia num
 *    valor enviado pelo cliente para isto.
 *  - Mobile nativo (id_token direto do SDK Google Sign-In): {id_token}
 */
class GoogleCallbackRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'code' => ['required_without:id_token', 'string'],
            'id_token' => ['required_without:code', 'string'],
            'device_name' => ['sometimes', 'string', 'max:120'],
        ];
    }
}
