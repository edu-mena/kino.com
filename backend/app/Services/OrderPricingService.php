<?php

namespace App\Services;

use App\Models\MenuItem;
use App\Models\Offer;
use App\Models\Restaurant;
use App\Models\SavedAddress;

/**
 * Espelha `lineUnitPrice`/`orderSubtotal`/`orderDiscount`/`orderDeliveryFee`/
 * `orderTotal` do frontend (src/lib/cart.tsx) — com uma diferença
 * deliberada: aqui o preço é calculado UMA VEZ, no momento da criação, e
 * gravado como snapshot (order_lines.unit_price_snapshot,
 * orders.subtotal/delivery_fee/total). O mock recalculava sempre do preço
 * ATUAL do prato, o que faz um pedido antigo "mudar de total" se o
 * restaurante editar o cardápio depois — bug conhecido do mock, corrigido
 * aqui, não reproduzido.
 */
class OrderPricingService
{
    public function __construct(private readonly DeliveryFeeCalculator $deliveryFeeCalculator) {}

    /**
     * @param  array<int, array{menu_item: MenuItem, qty: int, selected_ingredients: array<int, array{ingredient_id: int, included: bool}>}>  $lineInputs
     * @return array{
     *   lines: array<int, array{menu_item_id: int, item_name_snapshot: string, unit_price_snapshot: float, qty: int, line_ingredients: array, line_total: float}>,
     *   subtotal: float, discount: float, deliveryFee: float, total: float,
     *   promo: ?array{code: string, label: string, percentOff: int, freeDelivery: bool}
     * }
     */
    public function price(
        array $lineInputs,
        Restaurant $restaurant,
        string $fulfillmentType,
        ?SavedAddress $deliveryAddress,
        ?string $promoCode,
    ): array {
        $promo = $promoCode ? $this->resolvePromoCode($restaurant, $promoCode) : null;

        $lines = [];
        $subtotal = 0.0;

        foreach ($lineInputs as $input) {
            /** @var MenuItem $menuItem */
            $menuItem = $input['menu_item'];
            $qty = $input['qty'];

            $ingredientsById = $menuItem->ingredients->keyBy('id');
            $extras = 0.0;
            $ingredientsSnapshot = [];

            foreach ($input['selected_ingredients'] as $sel) {
                $def = $ingredientsById->get($sel['ingredient_id']);
                if (! $def) {
                    continue; // ingrediente não pertence a este prato — ignora silenciosamente
                }
                if ($sel['included'] && $def->extra_price > 0) {
                    $extras += (float) $def->extra_price;
                }
                $ingredientsSnapshot[] = [
                    'id' => $def->id,
                    'name' => $def->name,
                    'included' => $sel['included'],
                    'extraPrice' => $def->extra_price === null ? null : (float) $def->extra_price,
                ];
            }

            $unitPrice = (float) $menuItem->price + $extras;
            $lineTotal = $unitPrice * $qty;
            $subtotal += $lineTotal;

            $lines[] = [
                'menu_item_id' => $menuItem->id,
                'item_name_snapshot' => $menuItem->name,
                'unit_price_snapshot' => $unitPrice,
                'qty' => $qty,
                'line_ingredients' => $ingredientsSnapshot,
                'line_total' => $lineTotal,
            ];
        }

        $discount = $promo && ! $promo['freeDelivery']
            ? round($subtotal * ($promo['percentOff'] / 100))
            : 0.0;

        $deliveryFee = 0.0;
        if ($fulfillmentType === 'delivery') {
            $freeDelivery = $promo['freeDelivery'] ?? false;
            if (! $freeDelivery) {
                $distanceKm = $this->deliveryDistanceKm($restaurant, $deliveryAddress);
                $deliveryFee = $this->deliveryFeeCalculator->calculate((float) $restaurant->delivery_fee, $distanceKm);
            }
        }

        return [
            'lines' => $lines,
            'subtotal' => $subtotal,
            'discount' => $discount,
            'deliveryFee' => $deliveryFee,
            'total' => $subtotal - $discount + $deliveryFee,
            'promo' => $promo,
        ];
    }

    /**
     * @return ?array{code: string, label: string, percentOff: int, freeDelivery: bool}
     */
    private function resolvePromoCode(Restaurant $restaurant, string $rawCode): ?array
    {
        $code = mb_strtoupper(trim($rawCode));
        if ($code === '') {
            return null;
        }

        $offer = Offer::query()
            ->active()
            ->where('code', $code)
            ->where(fn ($q) => $q->whereNull('restaurant_id')->orWhere('restaurant_id', $restaurant->id))
            ->first();

        if (! $offer) {
            return null;
        }

        $freeDelivery = $offer->type === 'delivery';
        $percentOff = $freeDelivery ? 0 : max(0, min(100, (int) round($offer->percent_off ?? 0)));

        if (! $freeDelivery && $percentOff === 0) {
            return null;
        }

        return [
            'code' => $code,
            'label' => $offer->title,
            'percentOff' => $percentOff,
            'freeDelivery' => $freeDelivery,
        ];
    }

    /**
     * Distância real (Haversine) entre restaurante e morada — só quando
     * ambos têm lat/lng (geocoding real, ver plano). Sem coordenadas (morada
     * antiga sem geocode, ou geocoding desligado), assume dentro do raio
     * livre da política — não há como inventar uma distância plausível aqui
     * como o mock fazia com um hash fake.
     */
    private function deliveryDistanceKm(Restaurant $restaurant, ?SavedAddress $address): float
    {
        if (! $address || $address->lat === null || $address->lng === null
            || $restaurant->lat === null || $restaurant->lng === null) {
            return 0.0;
        }

        return $this->deliveryFeeCalculator->distanceKm(
            (float) $restaurant->lat, (float) $restaurant->lng,
            (float) $address->lat, (float) $address->lng,
        );
    }
}
