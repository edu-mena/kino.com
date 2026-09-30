<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ProfileView;
use App\Models\Review;
use App\Services\AccountDeletionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Direitos do titular dos dados (auditoria de segurança, Fase 3; Lei n.º
 * 22/11): ver tudo o que a Luku guarda sobre si (`export`) e apagar a conta
 * (`destroy`, ver AccountDeletionService).
 */
class AccountController extends Controller
{
    /** Tudo o que está associado à conta, num só JSON descarregável. Arrays
     * simples em vez dos Resources da API: é um arquivo para a pessoa, não
     * o contrato do frontend (e nada de URLs assinados que expiram). */
    public function export(Request $request): JsonResponse
    {
        $user = $request->user()->load([
            'preferences', 'savedAddresses', 'companies',
            'followedRestaurants:id,name', 'favoriteMenuItems:id,name',
        ]);

        $orders = $user->orders()->with('restaurant:id,name', 'lines')->latest()->get();
        $reservations = $user->reservations()->with('restaurant:id,name')->latest()->get();

        $data = [
            'exportedAt' => now()->toIso8601String(),
            'profile' => [
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'role' => $user->role,
                'avatarUrl' => $user->avatar_url,
                'signedInWithGoogle' => $user->google_id !== null,
                'createdAt' => $user->created_at?->toIso8601String(),
                'lastLoginAt' => $user->last_login_at?->toIso8601String(),
            ],
            'preferences' => $user->preferences?->only([
                'dietary_restrictions', 'language', 'notifications_enabled',
            ]),
            'savedAddresses' => $user->savedAddresses->map->only(['label', 'line1', 'line2', 'lat', 'lng', 'is_default']),
            'companies' => $user->companies->map->only(['name', 'nif', 'email']),
            'orders' => $orders->map(fn ($o) => [
                'id' => $o->uuid,
                'restaurant' => $o->restaurant?->name,
                'createdAt' => $o->created_at?->toIso8601String(),
                'status' => $o->status,
                'fulfillmentType' => $o->fulfillment_type,
                'customerName' => $o->customer_name,
                'customerPhone' => $o->customer_phone,
                'customerEmail' => $o->customer_email,
                'deliveryAddress' => $o->delivery_address_snapshot,
                'note' => $o->note,
                'invoiceCompany' => $o->invoice_company_snapshot,
                'items' => $o->lines->map(fn ($l) => ['name' => $l->item_name_snapshot, 'qty' => $l->qty, 'total' => (float) $l->line_total]),
                'total' => (float) $o->total,
            ]),
            'reservations' => $reservations->map(fn ($r) => [
                'id' => $r->uuid,
                'restaurant' => $r->restaurant?->name,
                'date' => (string) $r->date,
                'time' => (string) $r->time,
                'people' => $r->people_count,
                'status' => $r->status,
                'customerName' => $r->customer_name,
                'customerPhone' => $r->customer_phone,
                'customerEmail' => $r->customer_email,
                'specialRequests' => $r->special_requests,
            ]),
            'reviews' => Review::query()->where('user_id', $user->id)->with('restaurant:id,name')->get()
                ->map(fn ($r) => [
                    'restaurant' => $r->restaurant?->name,
                    'rating' => $r->rating,
                    'comment' => $r->comment,
                    'date' => $r->date?->toDateString(),
                ]),
            'followedRestaurants' => $user->followedRestaurants->pluck('name'),
            'favoriteDishes' => $user->favoriteMenuItems->pluck('name'),
            // "Quem viu o seu perfil": os restaurantes cujo perfil visitou
            // com sessão iniciada — também é informação sobre si.
            'restaurantProfileVisits' => ProfileView::query()->where('user_id', $user->id)->with('restaurant:id,name')->get()
                ->map(fn ($v) => [
                    'restaurant' => $v->restaurant?->name,
                    'visits' => $v->visits,
                    'firstAt' => $v->first_at?->toIso8601String(),
                    'lastAt' => $v->last_at?->toIso8601String(),
                ]),
        ];

        return response()->json(['data' => $data])
            ->header('Content-Disposition', 'attachment; filename="luku-os-meus-dados.json"');
    }

    public function destroy(Request $request, AccountDeletionService $deletion): JsonResponse
    {
        // Confirmação explícita no corpo — um DELETE acidental (ou forjado
        // por um script qualquer com o token) não chega para apagar tudo.
        $request->validate(['confirm' => ['required', 'accepted']]);

        $deletion->delete($request->user());

        return response()->json(['message' => 'A sua conta foi apagada.']);
    }
}
