<?php

namespace App\Http\Requests\Api\V1\Reservations;

use App\Models\Restaurant;
use Illuminate\Contracts\Validation\Validator as ValidatorContract;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Público — cliente autenticado OU convidado. Sem `table_id`: atribuir mesa
 * é sempre uma ação do restaurante depois (ver mock, `assignTable`), nunca
 * escolhida pelo cliente — e sem bloqueio de disponibilidade aqui (ver
 * ReservationOccupancyService: é sinalização, não rejeição).
 */
class StoreReservationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // 'sanctum' explícito — rota aceita convidados sem token.
        $user = $this->user('sanctum');

        return [
            'customer_name' => [$user ? 'sometimes' : 'required', 'string', 'max:150'],
            'customer_phone' => [$user ? 'sometimes' : 'required', 'string', 'max:30'],
            'customer_email' => ['sometimes', 'nullable', 'email'],
            'date' => ['required', 'date', 'after_or_equal:today'],
            'time' => ['required', 'date_format:H:i'],
            'people_count' => ['required', 'integer', 'min:1', 'max:50'],
            'special_requests' => ['sometimes', 'nullable', 'string', 'max:500'],
        ];
    }

    public function withValidator(ValidatorContract $validator): void
    {
        $validator->after(function (ValidatorContract $validator) {
            /** @var Restaurant $restaurant */
            $restaurant = $this->route('restaurant');

            if (! $restaurant->accepts_reservations) {
                $validator->errors()->add('date', 'Este restaurante não aceita reservas.');
            }
        });
    }
}
