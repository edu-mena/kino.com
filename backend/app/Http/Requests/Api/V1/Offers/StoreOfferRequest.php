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
        // `menu_item_ids`/`categories` chegam como um campo JSON só (não
        // `campo[]` repetido) — multipart não tem forma de representar um
        // array VAZIO, e uma edição precisa de conseguir LIMPAR uma seleção
        // anterior (ver `buildFormData`, api-offers.ts).
        foreach (['menu_item_ids', 'categories'] as $field) {
            if ($this->has($field) && is_string($this->input($field))) {
                $decoded = json_decode((string) $this->input($field), true);
                $this->merge([$field => is_array($decoded) ? $decoded : []]);
            }
        }
    }

    public function rules(): array
    {
        $rules = [
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

        // Visar pratos/categorias só faz sentido numa promoção do
        // restaurante — uma promoção institucional da Luku (storeGlobal,
        // sem {restaurant} na rota) não tem como restringir-se a um prato
        // de um restaurante específico.
        $restaurant = $this->route('restaurant');
        if ($restaurant) {
            $rules['menu_item_ids'] = ['sometimes', 'array'];
            $rules['menu_item_ids.*'] = ['string',
                Rule::exists('menu_items', 'uuid')->where('restaurant_id', $restaurant->id)];
            $rules['categories'] = ['sometimes', 'array'];
            $rules['categories.*'] = ['string', 'max:80'];
        } else {
            $rules['menu_item_ids'] = ['prohibited'];
            $rules['categories'] = ['prohibited'];
        }

        return $rules;
    }
}
