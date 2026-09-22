<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\SupportTickets\StoreSupportTicketRequest;
use App\Http\Resources\Api\V1\SupportTicketResource;
use App\Mail\SupportTicketMail;
use App\Models\Restaurant;
use App\Models\SupportTicket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;

class SupportTicketController extends Controller
{
    /** Todos os tickets, de qualquer restaurante — só system_operator (ver
     * mock, /sistema/suporte). */
    public function index(Request $request): AnonymousResourceCollection
    {
        abort_unless($request->user()->isSystemOperator(), 403);

        $tickets = SupportTicket::query()
            ->with('restaurant')
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->latest()
            ->get();

        return SupportTicketResource::collection($tickets);
    }

    public function indexForRestaurant(Request $request, Restaurant $restaurant): AnonymousResourceCollection
    {
        abort_unless(
            $request->user()->isSystemOperator() || $request->user()->can('manageOperations', $restaurant),
            403,
        );

        // `->with('restaurant')` — sem isto, `SupportTicketResource`
        // (`whenLoaded('restaurant', ...)`) nunca devolvia `restaurantId`/
        // `restaurantName` aqui, mesmo sabendo o restaurante pela rota.
        return SupportTicketResource::collection(
            $restaurant->supportTickets()->with('restaurant')->latest()->get(),
        );
    }

    public function store(StoreSupportTicketRequest $request, Restaurant $restaurant): JsonResponse
    {
        $ticket = $restaurant->supportTickets()->create([...$request->validated(), 'status' => 'open']);
        $ticket->setRelation('restaurant', $restaurant);

        // Antes disto, o frontend só abria o cliente de email do PRÓPRIO
        // restaurante (mailto:), com o endereço errado — a mensagem nunca
        // chegava de facto à Luku. Mesmo endereço do formulário de
        // /contacto (config('mail.contact_address')).
        Mail::to(config('mail.contact_address'))->queue(new SupportTicketMail($ticket));

        return (new SupportTicketResource($ticket))->response()->setStatusCode(201);
    }

    /** Só system_operator resolve — o próprio restaurante só cria/consulta. */
    public function updateStatus(Request $request, SupportTicket $ticket): SupportTicketResource
    {
        abort_unless($request->user()->isSystemOperator(), 403);

        $request->validate(['status' => ['required', Rule::in(['open', 'resolved'])]]);
        $ticket->update(['status' => $request->string('status')]);

        return new SupportTicketResource($ticket);
    }
}
