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
use App\Models\RestaurantPackage;
use App\Models\RestaurantTable;
use App\Services\MediaUploadService;
use App\Services\OrderPricingService;
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
            ->with('restaurant', 'table', 'restaurantPackage.packageType')
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
            ->with('table', 'restaurantPackage.packageType')
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

        $reservation->load(['table', 'restaurant', 'restaurantPackage.packageType']);

        if ($isStaff) {
            $this->attachOccupancy(collect([$reservation]), $reservation->restaurant, $occupancy);
        }

        return new ReservationResource($reservation);
    }

    public function store(StoreReservationRequest $request, Restaurant $restaurant, OrderPricingService $pricing): JsonResponse
    {
        $data = $request->validated();
        // 'sanctum' explícito — rota aceita convidados sem token.
        $user = $request->user('sanctum');

        // Reserva de pacote (Fase L3c) — já validado (restaurante certo,
        // ativo) em StoreReservationRequest. A caução passa a ser o preço
        // do pacote, não o valor genérico do restaurante; o resto do
        // mecanismo (promo, comprovativo, confirmação, fatura) é o mesmo.
        $package = isset($data['package_id'])
            ? RestaurantPackage::where('uuid', $data['package_id'])->first()
            : null;

        // Mesmo código promocional dos pedidos, aplicado à caução — mas só
        // quando o offer NÃO tem prato/categoria alvo (a caução não é
        // itemizada) e não é "delivery" (entrega grátis não se aplica a uma
        // reserva). Um código que não resolve, ou não é aplicável aqui, não
        // rejeita a reserva — só não desconta nada (mesma tolerância do
        // lado dos pedidos).
        $promo = $request->filled('promo_code') ? $pricing->resolvePromoCode($restaurant, $data['promo_code']) : null;
        $applicable = $promo && ! $promo['freeDelivery']
            && empty($promo['targetMenuItemIds']) && empty($promo['targetCategories']);

        $cautionAmount = $package ? (float) $package->price : (float) $restaurant->caution_amount;
        if ($applicable) {
            $cautionAmount = round($cautionAmount * (1 - $promo['percentOff'] / 100), 2);
        }

        $reservation = $restaurant->reservations()->create([
            'user_id' => $user?->id,
            'customer_name' => $data['customer_name'] ?? $user?->name ?? 'Cliente Luku',
            'customer_phone' => $data['customer_phone'] ?? $user?->phone ?? '',
            'customer_email' => $data['customer_email'] ?? $user?->email,
            'date' => $data['date'],
            'time' => $data['time'],
            'people_count' => $data['people_count'],
            'reservation_kind' => $package ? 'package' : 'table',
            'restaurant_package_id' => $package?->id,
            // Sempre o valor configurado do restaurante (ou o preço do
            // pacote, se for uma reserva de pacote), com o desconto do
            // código promocional já aplicado, se houver — ao contrário dos
            // pedidos, a caução de reserva não depende de "modo" (só existe
            // um: presencial) — ver mock, `addReservation`.
            'caution_amount' => $cautionAmount,
            'caution_status' => $cautionAmount > 0 ? 'pending' : 'not_required',
            'status' => 'pending',
            'status_updated_at' => now(),
            'special_requests' => $data['special_requests'] ?? null,
            ...($applicable ? [
                'promo_code' => $promo['code'],
                'promo_label' => $promo['label'],
                'promo_percent_off' => $promo['percentOff'],
            ] : []),
        ]);

        return response()->json([
            'data' => [
                ...(new ReservationResource($reservation->load('restaurantPackage.packageType')))->resolve($request),
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

        return new ReservationResource($reservation->load('table', 'restaurantPackage.packageType'));
    }

    /** Nunca bloqueado por sobreposição — só sinalizado (ver `index`/`show`
     * e ReservationOccupancyService). O staff decide. */
    public function assignTable(AssignTableRequest $request, Reservation $reservation): ReservationResource
    {
        $uuid = $request->validated('table_id');
        $tableId = $uuid ? RestaurantTable::where('uuid', $uuid)->value('id') : null;
        $reservation->update(['table_id' => $tableId]);

        return new ReservationResource($reservation->load('table', 'restaurantPackage.packageType'));
    }

    /**
     * Pendente: sempre pode cancelar. Confirmada: só dentro da janela que o
     * restaurante configurou (`reservation_cancellation_window_minutes`,
     * contada a partir de `status_updated_at` — o momento da confirmação),
     * `0`/sem janela mantém o comportamento de sempre (não pode cancelar
     * depois de confirmada). Nunca mexe em `caution_status` — cancelar não
     * é reembolsar; isso fica a cargo do restaurante, à parte.
     */
    public function cancel(Request $request, Reservation $reservation): ReservationResource
    {
        $this->assertOwnerOrGuest($request, $reservation);

        if ($reservation->status !== 'pending') {
            $window = $reservation->restaurant->reservation_cancellation_window_minutes;
            $withinWindow = $reservation->status === 'confirmed'
                && $window > 0
                && $reservation->status_updated_at
                && now()->lessThanOrEqualTo($reservation->status_updated_at->clone()->addMinutes($window));

            abort_unless($withinWindow, 422, $reservation->status === 'confirmed'
                ? 'O prazo para cancelar esta reserva já expirou.'
                : 'Esta reserva já não pode ser cancelada.');
        }

        $reservation->update(['status' => 'canceled', 'status_updated_at' => now()]);

        return new ReservationResource($reservation);
    }

    /** Comprovativo de pagamento da caução, carregado pelo cliente/convidado
     * — mirror exato de OrderController::storePaymentProof (imagem OU PDF,
     * bancos/carteiras digitais muitas vezes geram o comprovativo como
     * PDF). */
    public function storePaymentProof(Request $request, Reservation $reservation, MediaUploadService $uploads): ReservationResource
    {
        $this->assertOwnerOrGuest($request, $reservation);
        $request->validate(['proof' => ['required', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:8192']]);

        $url = $uploads->storeDocument($request->file('proof'), 'payment-proof', $reservation->uuid);
        $reservation->update(['payment_proof_url' => $url, 'payment_proof_at' => now()]);

        return new ReservationResource($reservation);
    }

    /** Staff confirma o pagamento da caução (depois de conferir o
     * comprovativo, ou por outra via) — `caution_status` NUNCA muda
     * sozinho ao carregar o comprovativo (ver `storePaymentProof`), é
     * sempre uma confirmação manual do restaurante. Sem isto, uma reserva
     * nunca chega a "Paga" — bloqueava silenciosamente o KPI de depósitos
     * cobrados e a ligação da caução a um pedido dine-in (Fase J3). */
    public function confirmCaution(Request $request, Reservation $reservation): ReservationResource
    {
        $this->authorize('manageOperations', $reservation->restaurant);
        abort_unless($reservation->caution_status === 'pending', 422, 'A caução desta reserva não está pendente.');

        $reservation->update(['caution_status' => 'paid']);

        return new ReservationResource($reservation);
    }

    /** Fatura da reserva, emitida pelo restaurante — mirror exato de
     * OrderController::storeInvoice. Usada sobretudo para cobrar a caução
     * de uma reserva marcada "não compareceu" (ver
     * UpdateReservationStatusRequest), mas também disponível numa reserva
     * normal, já que a caução combina na fatura final de consumo. */
    public function storeInvoice(Request $request, Reservation $reservation, MediaUploadService $uploads): ReservationResource
    {
        $this->authorize('manageOperations', $reservation->restaurant);
        $request->validate(['invoice' => ['required', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:8192']]);

        $url = $uploads->storeDocument($request->file('invoice'), 'invoice', $reservation->uuid);
        $reservation->update(['invoice_url' => $url, 'invoice_at' => now()]);

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
