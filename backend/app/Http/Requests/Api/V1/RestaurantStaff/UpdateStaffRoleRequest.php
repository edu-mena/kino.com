<?php

namespace App\Http\Requests\Api\V1\RestaurantStaff;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateStaffRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('inviteStaff', $this->route('restaurant'));
    }

    public function rules(): array
    {
        return [
            'role_in_restaurant' => ['required', Rule::in(['manager', 'staff'])],
        ];
    }
}
