<?php

namespace App\Http\Requests\Api\V1\Orders;

use App\Models\Restaurant;
use App\Models\User;
use Illuminate\Contracts\Validation\Validator as ValidatorContract;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Checkout público — cliente autenticado OU convidado (ver plano). Sem
 * `payment_method_code`/`caution_required`: esses só entram ao restaurante
 * ACEITAR o pedido (ver OrderController::accept + AcceptOrderRequest),
 * nunca escolhidos pelo cliente no checkout — mesma regra do mock
 * (admin.pedidos.tsx confirmAccept).
 */
class StoreOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // guest checkout é intencional; sem isto, sem pedido
    }

    /** 'sanctum' explícito — esta rota não passa por auth:sanctum (aceita
     * convidados sem token), então $this->user() sem guard nunca veria um
     * Bearer token presente. */
    private function authUser(): ?User
    {
        return $this->user('sanctum');
    }

    public function rules(): array
    {
        $restaurant = $this->route('restaurant');
        $user = $this->authUser();

        return [
            'fulfillment_type' => ['required', Rule::in(['delivery', 'takeaway', 'dinein'])],

            'customer_name' => [$user ? 'sometimes' : 'required', 'string', 'max:150'],
            'customer_phone' => [$user ? 'sometimes' : 'required', 'string', 'max:30'],
            'customer_email' => ['sometimes', 'nullable', 'email'],

            'items' => ['required', 'array', 'min:1'],
            // Valida pelo `uuid` — o único id que a API expõe
            // (MenuItemResource), nunca o interno. O controller resolve
            // para o id interno antes de gravar.
            'items.*.menu_item_id' => [
                'required', 'string',
                Rule::exists('menu_items', 'uuid')
                    ->where('restaurant_id', $restaurant->id)
                    ->where('is_available', true),
            ],
            'items.*.qty' => ['required', 'integer', 'min:1', 'max:50'],
            'items.*.selected_ingredients' => ['sometimes', 'array'],
            'items.*.selected_ingredients.*.ingredient_id' => ['required', 'integer'],
            'items.*.selected_ingredients.*.included' => ['required', 'boolean'],

            // delivery — valida pelo `uuid` (único id exposto pela API,
            // ver SavedAddressResource), o controller resolve para o
            // registo real.
            'saved_address_id' => ['sometimes', 'nullable', 'string', Rule::exists('saved_addresses', 'uuid')
                ->where('user_id', $user?->id ?? 0)],
            'delivery_address' => ['required_if:fulfillment_type,delivery', 'sometimes', 'array'],
            'delivery_address.label' => ['sometimes', 'nullable', 'string', 'max:80'],
            'delivery_address.line1' => ['required_with:delivery_address', 'string', 'max:255'],
            'delivery_address.line2' => ['sometimes', 'nullable', 'string', 'max:255'],
            'delivery_address.lat' => ['sometimes', 'nullable', 'numeric', 'between:-90,90'],
            'delivery_address.lng' => ['sometimes', 'nullable', 'numeric', 'between:-180,180'],

            // takeaway
            'pickup_asap' => ['required_if:fulfillment_type,takeaway', 'boolean'],
            'pickup_at' => ['required_if:pickup_asap,false', 'nullable', 'date', 'after:now'],

            // dinein
            'party_size' => ['required_if:fulfillment_type,dinein', 'integer', 'min:1', 'max:50'],

            'note' => ['sometimes', 'nullable', 'string', 'max:500'],
            'promo_code' => ['sometimes', 'nullable', 'string', 'max:40'],
        ];
    }

    public function withValidator(ValidatorContract $validator): void
    {
        $validator->after(function (ValidatorContract $validator) {
            /** @var Restaurant $restaurant */
            $restaurant = $this->route('restaurant');

            if ($restaurant->orders_paused_manually) {
                $validator->errors()->add('fulfillment_type', 'Este restaurante não está a aceitar pedidos agora.');

                return;
            }

            $mode = $this->input('fulfillment_type');
            if ($mode && ! in_array($mode, $restaurant->fulfillment_modes ?? [], true)) {
                $validator->errors()->add('fulfillment_type', 'Este restaurante não aceita pedidos nesse modo.');
            }

            if ($mode === 'delivery' && ! $restaurant->is_delivery_available) {
                $validator->errors()->add('fulfillment_type', 'Este restaurante não tem entrega disponível.');
            }

            // Precisa de morada de alguma forma: já guardada (conta) ou
            // enviada inline (convidado, ou conta sem querer guardar).
            if ($mode === 'delivery' && ! $this->filled('saved_address_id') && ! $this->filled('delivery_address')) {
                $validator->errors()->add('delivery_address', 'É preciso indicar a morada de entrega.');
            }
        });
    }
}
