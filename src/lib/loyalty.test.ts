import { describe, expect, it } from "vitest";
import type { Reservation } from "@/data/types";
import {
  computeOwnLoyalty,
  computeRestaurantLoyalty,
  GOLD_MIN_SPEND,
  progressToGold,
  tierFor,
} from "./loyalty";

const now = new Date("2026-10-10T12:00:00");

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

describe("cliente Gold", () => {
  it("mais de 25 cumpridos (26) ou 500.000 Kz", () => {
    expect(tierFor(25, 0)).toBe("regular");
    expect(tierFor(26, 0)).toBe("gold");
    expect(tierFor(0, GOLD_MIN_SPEND - 1)).toBe("regular");
    expect(tierFor(0, GOLD_MIN_SPEND)).toBe("gold");
  });

  it("soma pedidos cumpridos (com taxas) e cauções pagas; ignora o resto", () => {
    const map = computeRestaurantLoyalty(
      "r1",
      [
        resv({ cautionAmount: 50_000, cautionStatus: "Paga (Garantia)" }),
        resv({ status: "Recusada" }),
        resv({ status: "Não compareceu" }),
        resv({ date: "2026-10-20" }), // confirmada, mas ainda não aconteceu
        resv({ status: "Cancelada", cautionAmount: 90_000, cautionStatus: "Reembolsada" }),
      ],
      [order({ total: 450_000 }), order({ status: "canceled", total: 900_000 })],
      total,
      now,
    );
    const stats = map.get("ana@example.com");
    expect(stats).toEqual({ honoredCount: 2, spend: 500_000, tier: "gold" });
  });

  it("é por restaurante", () => {
    const map = computeRestaurantLoyalty(
      "r2",
      [],
      [order({ total: 900_000 }), order({ restaurantId: "r2", total: 10 })],
      total,
      now,
    );
    expect(map.get("ana@example.com")?.tier).toBe("regular");
  });

  it("cliente vê o próprio estatuto por restaurante", () => {
    const map = computeOwnLoyalty(
      "ana@example.com",
      [resv(), resv({ ownerKey: "outra" })],
      [order({ restaurantId: "r2", total: 600_000 })],
      total,
      now,
    );
    expect(map.get("r1")).toEqual({ honoredCount: 1, spend: 0, tier: "regular" });
    expect(map.get("r2")?.tier).toBe("gold");
  });

  it("progresso: basta uma das metas", () => {
    const p = progressToGold({ honoredCount: 13, spend: 400_000 });
    expect(p.remainingVisits).toBe(13);
    expect(p.remainingSpend).toBe(100_000);
    expect(p.ratio).toBeCloseTo(0.8);
  });
});
