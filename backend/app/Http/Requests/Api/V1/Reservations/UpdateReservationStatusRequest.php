<?php

namespace App\Http\Requests\Api\V1\Reservations;

use App\Models\Reservation;
use Carbon\Carbon;
use Illuminate\Contracts\Validation\Validator as ValidatorContract;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Transições de staff (ver mock, admin.reservas.tsx):
 *   pending -> confirmed | declined
 *   confirmed -> voided | no_show
 *   declined -> pending | voided -> pending (botão "Reabrir")
 * (pending -> canceled é ação do cliente/convidado — ver
 * ReservationController::cancel, não passa por aqui). */
class UpdateReservationStatusRequest extends FormRequest
{
    private const TRANSITIONS = [
        'pending' => ['confirmed', 'declined'],
        'confirmed' => ['voided', 'no_show'],
        'declined' => ['pending'],
        'voided' => ['pending'],
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

    /** Só marca "não compareceu" depois da hora da reserva já ter passado —
     * evita marcar por engano uma reserva que ainda vai acontecer. */
    public function withValidator(ValidatorContract $validator): void
    {
        $validator->after(function (ValidatorContract $validator) {
            if ($this->input('status') !== 'no_show') {
                return;
            }

            /** @var Reservation $reservation */
            $reservation = $this->route('reservation');
            $when = Carbon::parse($reservation->date->format('Y-m-d').' '.$reservation->time);

            if (now()->lessThan($when)) {
                $validator->errors()->add(
                    'status',
                    'Só é possível marcar "não compareceu" depois da hora da reserva.',
                );
            }
        });
    }
}
