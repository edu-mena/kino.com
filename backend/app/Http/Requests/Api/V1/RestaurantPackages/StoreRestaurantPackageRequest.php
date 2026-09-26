<?php

namespace App\Http\Requests\Api\V1\RestaurantPackages;

use App\Services\PlanLimitService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRestaurantPackageRequest extends FormRequest
{
    public function authorize(): bool
    {
        $restaurant = $this->route('restaurant');
        if (! $this->user()->can('manageOperations', $restaurant)) {
            return false;
        }

        // Mensagem distinta (não a genérica "unauthorized") para o frontend
        // saber mostrar "isto é do Plano Plus" em vez de um 403 qualquer.
        abort_unless(app(PlanLimitService::class)->allows($restaurant, 'packages'), 403, 'plan_locked');

        return true;
    }

    public function rules(): array
    {
        return [
            // Valida pelo `uuid` — o único id que a API expõe
            // (PackageTypeResource); o controller resolve para o id
            // interno antes de gravar. Só tipos ativos: um tipo
            // desativado pela equipa Luku não pode ser escolhido de novo
            // (quem já o tinha mantém, até editar).
            'package_type_id' => [
                'required', 'string',
                Rule::exists('package_types', 'uuid')->where('is_active', true),
            ],
            'title' => ['sometimes', 'nullable', 'string', 'max:120'],
            'description' => ['sometimes', 'nullable', 'string', 'max:500'],
            'price' => ['required', 'numeric', 'min:0'],
            'max_people' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'characteristics' => ['sometimes', 'array'],
            'characteristics.*' => ['string', 'max:80'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
