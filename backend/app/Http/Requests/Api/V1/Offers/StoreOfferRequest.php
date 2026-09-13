<?php

namespace App\Http\Requests\Api\V1\Offers;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreOfferRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // autorização real feita no controller (restaurante vs. global)
    }

    /** Normaliza ANTES da validação — sem isto, "luku20" e "LUKU20" não
     * colidiriam na unique check (Postgres é case-sensitive por omissão),
     * mas resolvePromoCode (OrderPricingService) trata-os como o mesmo
     * código na hora de aplicar. */
    protected function prepareForValidation(): void
    {
        if ($this->filled('code')) {
            $this->merge(['code' => mb_strtoupper(trim((string) $this->input('code')))]);
        }
    }

    public function rules(): array
    {
        return [
            'type' => ['required', Rule::in(['discount', 'delivery', 'happy-hour'])],
            'title' => ['required', 'string', 'max:150'],
            'description' => ['sometimes', 'nullable', 'string', 'max:500'],
            'code' => ['sometimes', 'nullable', 'string', 'max:40', 'alpha_dash', Rule::unique('offers', 'code')],
            'percent_off' => ['required_unless:type,delivery', 'nullable', 'integer', 'min:1', 'max:100'],
            'layout' => ['sometimes', 'nullable', Rule::in(['split', 'cover'])],
            'starts_at' => ['sometimes', 'nullable', 'date'],
            'ends_at' => ['sometimes', 'nullable', 'date', 'after:starts_at'],
            'media' => ['sometimes', 'nullable', 'file', 'mimes:jpg,jpeg,png,webp,mp4,mov,webm', 'max:102400'],
        ];
    }
}
