<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Subscriptions\ExtendTrialRequest;
use App\Http\Requests\Api\V1\Subscriptions\UpdateSubscriptionRequest;
use App\Http\Resources\Api\V1\SubscriptionResource;
use App\Models\Restaurant;
use App\Models\RestaurantSubscription;
use App\Support\RestaurantIndexCache;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Espelha src/data/subscriptions-store.ts (setPlan/setStatus/
 * registerPayment/extendTrial) — 4 ações distintas em vez de um PATCH
 * genérico, porque cada uma tem semântica própria (registerPayment nunca
 * desbloqueia uma suspensão sozinho, extendTrial força status="trial" de
 * volta mesmo que já estivesse noutro estado).
 */
class SubscriptionController extends Controller
{
    /** Todas as subscrições — painel de sistema (`/sistema/subscricoes`,
     * MRR/trials/atrasos). Não existia nenhum endpoint agregado, só por
     * restaurante — ver auditoria de go-live. */
    public function index(Request $request): AnonymousResourceCollection
    {
        abort_unless($request->user()->isSystemOperator(), 403);

        return SubscriptionResource::collection(
            RestaurantSubscription::query()->with('restaurant')->get(),
        );
    }

    public function show(Request $request, Restaurant $restaurant): SubscriptionResource
    {
        abort_unless(
            $request->user()->isSystemOperator() || $request->user()->can('manageOperations', $restaurant),
            403,
        );

        return new SubscriptionResource($restaurant->subscription()->firstOrFail());
    }

    public function update(UpdateSubscriptionRequest $request, Restaurant $restaurant): SubscriptionResource
    {
        $subscription = $restaurant->subscription()->firstOrFail();
        $subscription->update($request->validated());

        // `status` pode mudar aqui (ex: suspender) — afeta `isSuspended` na
        // listagem pública de restaurantes, que está cacheada (ver
        // RestaurantController::index).
        RestaurantIndexCache::forget();

        return new SubscriptionResource($subscription);
    }

    /** Marca a mensalidade como paga — nunca reabre uma suspensão sozinho
     * (ver mock: `status: s.status === "suspended" ? "suspended" : "active"`). */
    public function registerPayment(Request $request, Restaurant $restaurant): SubscriptionResource
    {
        abort_unless($request->user()->isSystemOperator(), 403);

        $subscription = $restaurant->subscription()->firstOrFail();
        $subscription->update([
            'last_payment_at' => now(),
            'status' => $subscription->status === 'suspended' ? 'suspended' : 'active',
        ]);

        return new SubscriptionResource($subscription);
    }

    public function extendTrial(ExtendTrialRequest $request, Restaurant $restaurant): SubscriptionResource
    {
        $subscription = $restaurant->subscription()->firstOrFail();
        $base = $subscription->trial_ends_at->max(now());

        $subscription->update([
            'trial_ends_at' => $base->addDays($request->validated('days')),
            'status' => 'trial',
        ]);

        // Sai de "suspended" para "trial" — mesma razão do update() acima.
        RestaurantIndexCache::forget();

        return new SubscriptionResource($subscription);
    }
}
