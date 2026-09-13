<?php

namespace App\Http\Requests\Api\V1\RestaurantStaff;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Só o owner convida (ver RestaurantPolicy::inviteStaff) — nunca cria
 * outro "owner" por aqui, só manager/staff; transferir a posse do
 * restaurante é uma ação distinta, fora do escopo desta fase. */
class InviteStaffRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('inviteStaff', $this->route('restaurant'));
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:150'],
            'role_in_restaurant' => ['required', Rule::in(['manager', 'staff'])],
        ];
    }
}
