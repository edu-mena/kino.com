<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\AuthorizesGuestOrOwnerAccess;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Orders\AcceptOrderRequest;
use App\Http\Requests\Api\V1\Orders\DispatchOrderRequest;
use App\Http\Requests\Api\V1\Orders\StoreOrderRequest;
use App\Http\Requests\Api\V1\Orders\UpdateOrderStatusRequest;
use App\Http\Resources\Api\V1\OrderResource;
use App\Models\Courier;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\Restaurant;
use App\Models\SavedAddress;
use App\Services\MediaUploadService;
use App\Services\OrderPricingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    use AuthorizesGuestOrOwnerAccess;

    /** Staff do restaurante — nunca lista de todos os pedidos globalmente. */
    public function index(Request $request, Restaurant $restaurant): AnonymousResourceCollection
    {
        $this->authorize('manageOperations', $restaurant);

        $orders = $restaurant->orders()
            ->with('lines.menuItem')
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->latest()
            ->cursorPaginate($request->integer('per_page', 30));

        return OrderResource::collection($orders);
    }

    public function show(Request $request, Order $order): OrderResource
    {
        // 'sanctum' explícito — rota aceita convidados sem token.
        if (! ($request->user('sanctum')?->can('manageOperations', $order->restaurant))) {
            $this->assertOwnerOrGuest($request, $order);
        }

        return new OrderResource($order->load('lines.menuItem', 'restaurant'));
    }

    public function store(
        StoreOrderRequest $request,
        Restaurant $restaurant,
        OrderPricingService $pricing,
    ): JsonResponse {
        $data = $request->validated();
        // 'sanctum' explícito — rota aceita convidados sem token.
        $user = $request->user('sanctum');

        $menuItems = MenuItem::query()
            ->with('ingredients')
            ->whereIn('id', collect($data['items'])->pluck('menu_item_id'))
            ->get()
            ->keyBy('id');

        $lineInputs = collect($data['items'])->map(fn ($item) => [
            'menu_item' => $menuItems[$item['menu_item_id']],
            'qty' => $item['qty'],
            'selected_ingredients' => $item['selected_ingredients'] ?? [],
        ])->all();

        $deliveryAddress = null;
        $deliverySnapshot = null;
        if ($data['fulfillment_type'] === 'delivery') {
            if (! empty($data['saved_address_id'])) {
                $deliveryAddress = SavedAddress::query()->find($data['saved_address_id']);
                $deliverySnapshot = $deliveryAddress ? [
                    'label' => $deliveryAddress->label,
                    'line1' => $deliveryAddress->line1,
                    'line2' => $deliveryAddress->line2,
                    'lat' => $deliveryAddress->lat === null ? null : (float) $deliveryAddress->lat,
                    'lng' => $deliveryAddress->lng === null ? null : (float) $deliveryAddress->lng,
                ] : null;
            } elseif (! empty($data['delivery_address'])) {
                $deliverySnapshot = $data['delivery_address'];
                $deliveryAddress = new SavedAddress($data['delivery_address']);
            }
        }

        $priced = $pricing->price(
            $lineInputs,
            $restaurant,
            $data['fulfillment_type'],
            $deliveryAddress,
            $data['promo_code'] ?? null,
        );

        $order = DB::transaction(function () use ($restaurant, $data, $user, $deliverySnapshot, $priced) {
            $order = $restaurant->orders()->create([
                'user_id' => $user?->id,
                'fulfillment_type' => $data['fulfillment_type'],
                'customer_name' => $data['customer_name'] ?? $user?->name ?? 'Cliente Luku',
                'customer_phone' => $data['customer_phone'] ?? $user?->phone ?? '',
                'customer_email' => $data['customer_email'] ?? $user?->email,
                'delivery_address_snapshot' => $deliverySnapshot,
                'pickup_asap' => $data['pickup_asap'] ?? null,
                'pickup_at' => $data['pickup_at'] ?? null,
                'party_size' => $data['party_size'] ?? null,
                'status' => 'pending',
                'estimated_minutes' => $restaurant->estimated_delivery_minutes ?? 30,
                'note' => $data['note'] ?? null,
                'promo_code' => $priced['promo']['code'] ?? null,
                'promo_label' => $priced['promo']['label'] ?? null,
                'promo_percent_off' => $priced['promo']['percentOff'] ?? null,
                'promo_free_delivery' => $priced['promo']['freeDelivery'] ?? false,
                'subtotal' => $priced['subtotal'],
                'delivery_fee' => $priced['deliveryFee'],
                'total' => $priced['total'],
            ]);

            foreach ($priced['lines'] as $line) {
                $order->lines()->create($line);
            }

            return $order;
        });

        $order->load('lines.menuItem', 'restaurant');

        return response()->json([
            'data' => [
                ...(new OrderResource($order))->resolve($request),
                // Única vez que isto aparece numa resposta — ver OrderResource.
                'guestToken' => $order->guest_token,
            ],
        ], 201);
    }

    /** Restaurante aceita: fixa o método de pagamento e calcula a caução
     * (nunca o valor enviado pelo cliente — ver AcceptOrderRequest). */
    public function accept(AcceptOrderRequest $request, Order $order): OrderResource
    {
        $requiresCaution = (float) $order->restaurant->caution_amount > 0
            && in_array($order->fulfillment_type, $order->restaurant->caution_modes_for_orders ?? [], true);

        $order->update([
            'status' => 'accepted',
            'payment_method_code' => $request->validated('payment_method_code'),
            'caution_required' => $requiresCaution ? $order->restaurant->caution_amount : null,
        ]);

        return new OrderResource($order->load('lines.menuItem', 'restaurant'));
    }

    /** "Aceite" -> "A caminho" — atribui o estafeta e avança o estado numa
     * única transação atómica (ver DispatchOrderRequest). */
    public function dispatch(DispatchOrderRequest $request, Order $order): OrderResource
    {
        DB::transaction(function () use ($request, $order) {
            $courier = Courier::query()->where('uuid', $request->validated('courier_id'))->lockForUpdate()->firstOrFail();

            // Revalida "disponível" dentro do lock — a checagem no
            // FormRequest já passou, mas sem o lock duas dispatches
            // concorrentes para o mesmo estafeta poderiam ambas passar essa
            // checagem antes de qualquer uma escrever.
            abort_if($courier->status !== 'disponivel', 422, 'Este estafeta não está disponível.');

            $courier->update(['status' => 'em_entrega', 'active_order_id' => $order->id]);
            $order->update(['status' => 'on_the_way']);
        });

        return new OrderResource($order->fresh()->load('lines.menuItem', 'restaurant'));
    }

    public function updateStatus(UpdateOrderStatusRequest $request, Order $order): OrderResource
    {
        $status = $request->validated('status');
        $order->update([
            'status' => $status,
            ...($status === 'delivered' ? ['delivered_at' => now()] : []),
        ]);

        return new OrderResource($order->load('lines.menuItem', 'restaurant'));
    }

    /** Cliente cancela — só enquanto "pending" (ver mock, cancelOrder). */
    public function cancel(Request $request, Order $order): OrderResource
    {
        $this->assertOwnerOrGuest($request, $order);
        abort_unless($order->status === 'pending', 422, 'Só é possível cancelar um pedido ainda pendente.');

        $order->update(['status' => 'canceled']);

        return new OrderResource($order);
    }

    public function storePaymentProof(Request $request, Order $order, MediaUploadService $uploads): OrderResource
    {
        $this->assertOwnerOrGuest($request, $order);
        $request->validate(['proof' => ['required', 'file', 'image', 'max:8192']]);

        $url = $uploads->storeImage($request->file('proof'), 'payment-proof', $order->uuid);
        $order->update(['payment_proof_url' => $url, 'payment_proof_at' => now()]);

        return new OrderResource($order);
    }
}
