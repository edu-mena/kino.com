<?php

namespace App\Http\Requests\Api\V1\Uploads;

use Illuminate\Foundation\Http\FormRequest;

class StoreUploadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null; // qualquer role autenticado — ver plano
    }

    public function rules(): array
    {
        return [
            'file' => ['required', 'file', 'image', 'max:8192'],
            'purpose' => ['required', 'string', 'in:dish,cover,wallpaper,gallery,promo,story'],
        ];
    }
}
