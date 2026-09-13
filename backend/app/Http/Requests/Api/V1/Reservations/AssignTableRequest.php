<?php

namespace App\Http\Requests\Api\V1\Reservations;

use App\Models\Reservation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** `table_id: null` desatribui — nunca bloqueia por sobreposição (ver
 * ReservationOccupancyService: é sinal para o staff decidir, não uma
 * trava). */
class AssignTableRequest extends FormRequest
{
    public function authorize(): bool
    {
        $reservation = $this->route('reservation');

        return $this->user()->can('manageOperations', $reservation->restaurant);
    }

    public function rules(): array
    {
        /** @var Reservation $reservation */
        $reservation = $this->route('reservation');

        return [
            'table_id' => [
                'sometimes', 'nullable', 'integer',
                Rule::exists('restaurant_tables', 'id')->where('restaurant_id', $reservation->restaurant_id),
            ],
        ];
    }
}
