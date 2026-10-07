import { describe, expect, it } from "vitest";
import { clampToRadius, distanceFromDeviceKm, haversineKm } from "./geo";

describe("clampToRadius", () => {
  const anchor = { lat: -8.8147, lng: 13.2302 };

  it("deixa o ponto como está dentro do raio", () => {
    const p = { lat: -8.815, lng: 13.2305 };
    expect(clampToRadius(anchor, p, 150)).toEqual({ point: p, clamped: false });
  });

  it("puxa para a borda do raio, na mesma direção, quando sai dele", () => {
    const far = { lat: -8.8247, lng: 13.2402 }; // ~1.5 km
    const { point, clamped } = clampToRadius(anchor, far, 150);
    expect(clamped).toBe(true);
    const meters = haversineKm([anchor.lat, anchor.lng], [point.lat, point.lng]) * 1000;
    expect(meters).toBeGreaterThan(148);
    expect(meters).toBeLessThanOrEqual(151);
    expect(point.lat).toBeLessThan(anchor.lat);
    expect(point.lng).toBeGreaterThan(anchor.lng);
  });
});

describe("distanceFromDeviceKm", () => {
  const luanda: [number, number] = [-8.8147, 13.2302];

  it("calcula a distância real quando há GPS e coordenadas do restaurante", () => {
    expect(distanceFromDeviceKm(luanda, { lat: -8.8247, lng: 13.2402 })).toBe(1.6);
  });

  it("sem localização autorizada ou sem coordenadas, não inventa nada", () => {
    expect(distanceFromDeviceKm(null, { lat: -8.8, lng: 13.2 })).toBeUndefined();
    expect(distanceFromDeviceKm(luanda, { lat: null, lng: 13.2 })).toBeUndefined();
    expect(distanceFromDeviceKm(luanda, undefined)).toBeUndefined();
  });
});
