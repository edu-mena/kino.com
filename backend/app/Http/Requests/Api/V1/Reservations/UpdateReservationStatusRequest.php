<?php

namespace App\Http\Requests\Api\V1\Reservations;

use App\Models\Reservation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Transições de staff (ver mock, admin.reservas.tsx):
 *   pending -> confirmed | declined
 *   confirmed -> voided
 * (pending -> canceled é ação do cliente/convidado — ver
 * ReservationController::cancel, não passa por aqui). */
class UpdateReservationStatusRequest extends FormRequest
{
    private const TRANSITIONS = [
        'pending' => ['confirmed', 'declined'],
        'confirmed' => ['voided'],
    ];

    public function authorize(): bool
    {
        $reservation = $this->route('reservation');

        return $this->user()->can('manageOperations', $reservation->restaurant);
    }

    public function rules(): array
    {
        /** @var Reservation $reservation */
        $reservation = $this->route('reservation');
        $allowed = self::TRANSITIONS[$reservation->status] ?? [];

        return [
            'status' => ['required', Rule::in($allowed)],
        ];
    }

    public function messages(): array
    {
        return ['status.in' => 'Transição de estado inválida a partir do estado atual da reserva.'];
    }
}
