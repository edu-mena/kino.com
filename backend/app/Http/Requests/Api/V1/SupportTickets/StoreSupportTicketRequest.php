<?php

namespace App\Http\Requests\Api\V1\SupportTickets;

use Illuminate\Foundation\Http\FormRequest;

class StoreSupportTicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('manageOperations', $this->route('restaurant'));
    }

    public function rules(): array
    {
        return [
            'subject' => ['required', 'string', 'max:150'],
            'message' => ['required', 'string', 'max:2000'],
        ];
    }
}
