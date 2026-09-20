<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\AuthorizesGuestOrOwnerAccess;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Reservations\AssignTableRequest;
use App\Http\Requests\Api\V1\Reservations\StoreReservationRequest;
use App\Http\Requests\Api\V1\Reservations\UpdateReservationStatusRequest;
use App\Http\Resources\Api\V1\ReservationResource;
use App\Models\Reservation;
use App\Models\Restaurant;
use App\Models\RestaurantTable;
use App\Services\ReservationOccupancyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Collection;

class ReservationController extends Controller
{
    use AuthorizesGuestOrOwnerAccess;

    /** Reservas do próprio cliente autenticado, em qualquer restaurante —
     * ver mock, `reservations.tsx` (`useReservations().reservations`, lidas
     * pelo cliente em `/reservas`). Convidados não têm sessão para isto;
     * usam o `guestToken` devolvido em `store()` + `show()` por reserva. */
    public function mine(Request $request): AnonymousResourceCollection
    {
        $reservations = $request->user()->reservations()
            ->with('restaurant', 'table')
            ->latest()
            ->get();

        return ReservationResource::collection($reservations);
    }

    public function index(
        Request $request,
        Restaurant $restaurant,
        ReservationOccupancyService $occupancy,
    ): AnonymousResourceCollection {
        $this->authorize('manageOperations', $restaurant);

        $reservations = $restaurant->reservations()
            ->with('table')
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('date'), fn ($q) => $q->whereDate('date', $request->string('date')))
            ->orderBy('date')
            ->orderBy('time')
            ->get();

        $this->attachOccupancy($reservations, $restaurant, $occupancy);

        return ReservationResource::collection($reservations);
    }

    public function show(
        Request $request,
        Reservation $reservation,
        ReservationOccupancyService $occupancy,
    ): ReservationResource {
        // 'sanctum' explícito — rota aceita convidados sem token.
        $isStaff = $request->user('sanctum')?->can('manageOperations', $reservation->restaurant);
        if (! $isStaff) {
            $this->assertOwnerOrGuest($request, $reservation);
        }

        $reservation->load(['table', 'restaurant']);

        if ($isStaff) {
            $this->attachOccupancy(collect([$reservation]), $reservation->restaurant, $occupancy);
        }

        return new ReservationResource($reservation);
    }

    public function store(StoreReservationRequest $request, Restaurant $restaurant): JsonResponse
    {
        $data = $request->validated();
        // 'sanctum' explícito — rota aceita convidados sem token.
        $user = $request->user('sanctum');

        $reservation = $restaurant->reservations()->create([
            'user_id' => $user?->id,
            'customer_name' => $data['customer_name'] ?? $user?->name ?? 'Cliente Luku',
            'customer_phone' => $data['customer_phone'] ?? $user?->phone ?? '',
            'customer_email' => $data['customer_email'] ?? $user?->email,
            'date' => $data['date'],
            'time' => $data['time'],
            'people_count' => $data['people_count'],
            // Sempre o valor configurado do restaurante — ao contrário dos
            // pedidos, a caução de reserva não depende de "modo" (só existe
            // um: presencial) — ver mock, `addReservation`.
            'caution_amount' => $restaurant->caution_amount,
            'caution_status' => (float) $restaurant->caution_amount > 0 ? 'pending' : 'not_required',
            'status' => 'pending',
            'status_updated_at' => now(),
            'special_requests' => $data['special_requests'] ?? null,
        ]);

        return response()->json([
            'data' => [
                ...(new ReservationResource($reservation))->resolve($request),
                'guestToken' => $reservation->guest_token,
            ],
        ], 201);
    }

    public function updateStatus(UpdateReservationStatusRequest $request, Reservation $reservation): ReservationResource
    {
        $reservation->update([
            'status' => $request->validated('status'),
            'status_updated_at' => now(),
        ]);

        return new ReservationResource($reservation->load('table'));
    }

    /** Nunca bloqueado por sobreposição — só sinalizado (ver `index`/`show`
     * e ReservationOccupancyService). O staff decide. */
    public function assignTable(AssignTableRequest $request, Reservation $reservation): ReservationResource
    {
        $uuid = $request->validated('table_id');
        $tableId = $uuid ? RestaurantTable::where('uuid', $uuid)->value('id') : null;
        $reservation->update(['table_id' => $tableId]);

        return new ReservationResource($reservation->load('table'));
    }

    /** Cliente/convidado cancela — só enquanto "pending" (ver mock,
     * reservas.tsx: botão de cancelar só aparece nesse estado). */
    public function cancel(Request $request, Reservation $reservation): ReservationResource
    {
        $this->assertOwnerOrGuest($request, $reservation);
        abort_unless($reservation->status === 'pending', 422, 'Só é possível cancelar uma reserva ainda pendente.');

        $reservation->update(['status' => 'canceled', 'status_updated_at' => now()]);

        return new ReservationResource($reservation);
    }

    /**
     * @param  Collection<int, Reservation>  $reservations
     */
    private function attachOccupancy(
        $reservations,
        Restaurant $restaurant,
        ReservationOccupancyService $occupancy,
    ): void {
        $slotMin = $restaurant->reservation_slot_minutes;
        $totalSeats = (int) $restaurant->tables()->sum('seats');
        $tableCount = $restaurant->tables()->count();

        // Universo de "reservas que ocupam sala, futuras" para calcular
        // sobreposição — precisa de TODAS as reservas do restaurante nessa
        // condição, não só as da página atual (senão uma reserva no fim de
        // uma lista filtrada não veria o conflito com uma no início).
        $future = $restaurant->reservations()
            ->whereIn('status', ['pending', 'confirmed'])
            ->where('date', '>=', now()->toDateString())
            ->get();

        foreach ($reservations as $reservation) {
            $reservation->occupancy = $occupancy->windowOccupancy(
                $reservation, $future, $slotMin, $totalSeats, $tableCount,
            );
        }
    }
}
