<?php

namespace App\Http\Requests\Api\V1\Uploads;

use Illuminate\Foundation\Http\FormRequest;

class StoreUploadRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Só quem gere conteúdo (painéis de restaurante e de sistema — os
        // únicos que usam este endpoint). Antes qualquer cliente com conta
        // podia alojar imagens arbitrárias na CDN pública da Luku
        // (auditoria de segurança, Fase 6).
        return in_array($this->user()?->role, ['restaurant_staff', 'system_operator'], true);
    }

    public function rules(): array
    {
        return [
            'file' => ['required', 'file', 'image', 'max:8192'],
            'purpose' => ['required', 'string', 'in:dish,cover,wallpaper,gallery,promo,story,site'],
        ];
    }
}
