import { describe, expect, it } from "vitest";
import type { Reservation } from "@/data/types";
import {
  computeOwnLoyalty,
  computeRestaurantLoyalty,
  GOLD_MIN_SPEND,
  nextTier,
  PLATINUM_ABOVE_SPEND,
  tierFor,
} from "./loyalty";

function resv(over: Partial<Reservation> = {}): Reservation {
  return {
    id: Math.random().toString(36),
    restaurantId: "r1",
    ownerKey: "ana@example.com",
    restaurantName: "R1",
    restaurantImage: "",
    customerName: "Ana",
    customerPhone: "923000000",
    customerEmail: "ana@example.com",
    date: "2026-10-01",
    time: "20:00",
    peopleCount: 2,
    cautionAmount: 0,
    cautionStatus: "Sem caução",
    status: "Confirmada",
    createdAt: "2026-09-30T10:00:00",
    ...over,
  } as Reservation;
}

type O = {
  id: string;
  restaurantId: string;
  status: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  ownerKey?: string;
  total: number;
};
const order = (over: Partial<O> = {}): O => ({
  id: Math.random().toString(36),
  restaurantId: "r1",
  status: "completed",
  customerName: "Ana",
  customerPhone: "923000000",
  customerEmail: "ana@example.com",
  ownerKey: "ana@example.com",
  total: 1000,
  ...over,
});
const total = (o: O) => o.total;

describe("níveis de cliente (só pelo gasto)", () => {
  it("Gold a partir de 500.000 Kz, Platina só acima de 1.000.000 Kz", () => {
    expect(tierFor(GOLD_MIN_SPEND - 1)).toBe("regular");
    expect(tierFor(GOLD_MIN_SPEND)).toBe("gold");
    expect(tierFor(PLATINUM_ABOVE_SPEND)).toBe("gold");
    expect(tierFor(PLATINUM_ABOVE_SPEND + 1)).toBe("platinum");
  });

  it("muitas visitas sem gasto não dão nível nenhum", () => {
    const reservations = Array.from({ length: 40 }, () => resv());
    const map = computeRestaurantLoyalty("r1", reservations, [], total);
    expect(map.get("ana@example.com")).toEqual({ spend: 0, tier: "regular" });
  });

  it("soma pedidos cumpridos (com taxas) e cauções pagas; ignora o resto", () => {
    const map = computeRestaurantLoyalty(
      "r1",
      [
        resv({ cautionAmount: 50_000, cautionStatus: "Paga (Garantia)" }),
        resv({ status: "Cancelada", cautionAmount: 90_000, cautionStatus: "Reembolsada" }),
      ],
      [order({ total: 450_000 }), order({ status: "canceled", total: 900_000 })],
      total,
    );
    expect(map.get("ana@example.com")).toEqual({ spend: 500_000, tier: "gold" });
  });

  it("é por restaurante", () => {
    const map = computeRestaurantLoyalty(
      "r2",
      [],
      [order({ total: 900_000 }), order({ restaurantId: "r2", total: 10 })],
      total,
    );
    expect(map.get("ana@example.com")?.tier).toBe("regular");
  });

  it("cliente vê o próprio nível por restaurante", () => {
    const map = computeOwnLoyalty(
      "ana@example.com",
      [resv(), resv({ ownerKey: "outra", cautionAmount: 999_999, cautionStatus: "Paga" })],
      [order({ restaurantId: "r2", total: 1_200_000 })],
      total,
    );
    expect(map.get("r1")).toEqual({ spend: 0, tier: "regular" });
    expect(map.get("r2")?.tier).toBe("platinum");
  });

  it("quanto falta para o nível seguinte", () => {
    expect(nextTier(400_000)).toEqual({ tier: "gold", remaining: 100_000, ratio: 0.8 });
    expect(nextTier(1_000_000)?.tier).toBe("platinum");
    expect(nextTier(1_000_000)?.remaining).toBe(1);
    expect(nextTier(1_500_000)).toBeNull();
  });
});
