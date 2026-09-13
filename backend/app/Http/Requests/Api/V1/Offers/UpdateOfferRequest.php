<?php

namespace App\Http\Requests\Api\V1\Offers;

use App\Models\Offer;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateOfferRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Offer $offer */
        $offer = $this->route('offer');

        if ($offer->restaurant_id === null) {
            return $this->user()->isSystemOperator();
        }

        return $this->user()->can('manageOperations', $offer->restaurant);
    }

    protected function prepareForValidation(): void
    {
        if ($this->filled('code')) {
            $this->merge(['code' => mb_strtoupper(trim((string) $this->input('code')))]);
        }
    }

    public function rules(): array
    {
        /** @var Offer $offer */
        $offer = $this->route('offer');

        return [
            'type' => ['sometimes', Rule::in(['discount', 'delivery', 'happy-hour'])],
            'title' => ['sometimes', 'string', 'max:150'],
            'description' => ['sometimes', 'nullable', 'string', 'max:500'],
            'code' => ['sometimes', 'nullable', 'string', 'max:40', 'alpha_dash', Rule::unique('offers', 'code')->ignore($offer->id)],
            'percent_off' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:100'],
            'layout' => ['sometimes', 'nullable', Rule::in(['split', 'cover'])],
            'starts_at' => ['sometimes', 'date'],
            'ends_at' => ['sometimes', 'nullable', 'date', 'after:starts_at'],
            'media' => ['sometimes', 'nullable', 'file', 'mimes:jpg,jpeg,png,webp,mp4,mov,webm', 'max:102400'],
        ];
    }
}
