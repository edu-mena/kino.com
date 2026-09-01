import { describe, expect, it } from "vitest";
import { assessDelivery, DELIVERY_RADIUS_KM, minutesSince, orderDistanceKm } from "./delivery-eval";
import type { CartOrder } from "./cart";

function makeOrder(id: string, addressId: string): CartOrder {
  return {
    id,
    restaurantId: "rest-1",
    lines: [],
    createdAt: new Date().toISOString(),
    customerName: "Cliente",
    customerPhone: "",
    deliveryAddress: { id: addressId, label: "Casa", line1: "", line2: "" },
    status: "pending",
    estimatedMinutes: 30,
  };
}

describe("orderDistanceKm", () => {
  it("é determinística para o mesmo par morada+pedido", () => {
    const order = makeOrder("order-1", "addr-1");
    expect(orderDistanceKm(order)).toBe(orderDistanceKm(order));
  });

  it("varia entre pedidos diferentes", () => {
    const a = orderDistanceKm(makeOrder("order-1", "addr-1"));
    const b = orderDistanceKm(makeOrder("order-2", "addr-2"));
    expect(a).not.toBe(b);
  });
});

describe("assessDelivery", () => {
  it("classifica dentro/perto/fora do raio de forma consistente com a distância", () => {
    const order = makeOrder("order-1", "addr-1");
    const { km, level, radiusKm } = assessDelivery(order);
    expect(radiusKm).toBe(DELIVERY_RADIUS_KM);
    if (km > DELIVERY_RADIUS_KM) expect(level).toBe("outOfRange");
    else if (km > 7) expect(level).toBe("far");
    else expect(level).toBe("ok");
  });
});

describe("minutesSince", () => {
  it("calcula minutos decorridos", () => {
    const tenMinAgo = new Date(Date.now() - 10 * 60_000).toISOString();
    expect(minutesSince(tenMinAgo)).toBe(10);
  });

  it("nunca é negativo (instante futuro)", () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(minutesSince(future)).toBe(0);
  });
});
