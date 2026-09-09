import { describe, expect, it } from "vitest";
import { computeDeliveryFee, DEFAULT_DELIVERY_POLICY } from "./platform-settings-store";

const policy = { freeRadiusKm: 12, perKmSurchargeKz: 400 };

describe("computeDeliveryFee", () => {
  it("cobra só a taxa única dentro do raio", () => {
    expect(computeDeliveryFee(1500, 5, policy)).toBe(1500);
    expect(computeDeliveryFee(1500, 12, policy)).toBe(1500);
    expect(computeDeliveryFee(1500, 11.9, policy)).toBe(1500);
  });

  it("soma o acréscimo por cada km começado acima do raio", () => {
    expect(computeDeliveryFee(1500, 13, policy)).toBe(1900); // +1 km
    expect(computeDeliveryFee(1500, 12.1, policy)).toBe(1900); // km começado conta
    expect(computeDeliveryFee(1500, 15, policy)).toBe(2700); // +3 km
  });

  it("respeita uma política alterada (raio e acréscimo diferentes)", () => {
    expect(computeDeliveryFee(1000, 20, { freeRadiusKm: 8, perKmSurchargeKz: 250 })).toBe(
      1000 + 12 * 250,
    );
  });

  it("a política por omissão é 12 km / 400 Kz", () => {
    expect(DEFAULT_DELIVERY_POLICY).toEqual({ freeRadiusKm: 12, perKmSurchargeKz: 400 });
  });
});
