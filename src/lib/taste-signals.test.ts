// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import type { MenuItem } from "@/data/types";
import {
  buildBehaviorProfile,
  clearTasteSignals,
  norm,
  readTasteEvents,
  recordCategorySignal,
  recordDishSignal,
  recordSearchSignal,
  resetTasteSignalsCache,
  type TasteEvent,
} from "./taste-signals";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 7, 12);

function dish(id: string, category: string, ingredients: string[], restaurantId = "r1"): MenuItem {
  return {
    id,
    restaurantId,
    name: id,
    description: "",
    price: 1000,
    category,
    image: "",
    isAvailable: true,
    portionInfo: "",
    prepTimeMinutes: 10,
    ingredients: ingredients.map((name, i) => ({ id: `${id}-${i}`, name, removable: true })),
  };
}

const muamba = dish("Muamba de galinha", "Pratos Quentes", ["Galinha", "Dendém", "Quiabo"]);
const frango = dish("Frango grelhado", "Grelhados", ["Frango", "Limão"], "r2");
const picanha = dish("Picanha", "Grelhados", ["Carne de vaca"], "r2");

beforeEach(() => {
  window.localStorage.clear();
  resetTasteSignalsCache();
});

describe("registo de sinais (só neste aparelho)", () => {
  it("guarda pratos vistos/adicionados com o essencial do prato", () => {
    recordDishSignal("view", muamba, "Angolana", NOW);
    recordDishSignal("cart", frango, undefined, NOW);

    const events = readTasteEvents();
    expect(events.map((e) => e.kind)).toEqual(["view", "cart"]);
    expect(events[0]).toMatchObject({
      dish: { category: "Pratos Quentes", restaurantId: "r1", cuisine: "Angolana" },
    });
    expect(window.localStorage.getItem("luku_taste_signals_v1")).toContain("Pratos Quentes");
  });

  it("escrever uma pesquisa conta como um só sinal com o último termo", () => {
    recordSearchSignal("fra", NOW);
    recordSearchSignal("frang", NOW + 1_000);
    recordSearchSignal("Frango", NOW + 2_000);

    expect(readTasteEvents()).toEqual([{ kind: "search", at: NOW + 2_000, query: "frango" }]);
  });

  it("pesquisas diferentes, ou a mesma minutos depois, são sinais separados", () => {
    recordSearchSignal("frango", NOW);
    recordSearchSignal("muamba", NOW + 1_000);
    recordSearchSignal("muamba", NOW + 5 * 60_000);

    expect(readTasteEvents().map((e) => (e.kind === "search" ? e.query : ""))).toEqual([
      "frango",
      "muamba",
      "muamba",
    ]);
  });

  it("ignora pesquisas curtas e categorias vazias", () => {
    recordSearchSignal("fr", NOW);
    recordCategorySignal("", NOW);
    expect(readTasteEvents()).toEqual([]);
  });

  it("guarda no máximo os 300 sinais mais recentes e esquece os de há mais de 90 dias", () => {
    recordCategorySignal("Antiga", NOW - 100 * DAY);
    for (let i = 0; i < 305; i += 1) recordCategorySignal(`Cat ${i}`, NOW);

    const events = readTasteEvents();
    expect(events).toHaveLength(300);
    expect(events.some((e) => e.kind === "category" && e.category === "Antiga")).toBe(false);
    expect(events.at(-1)).toMatchObject({ category: "Cat 304" });
  });

  it("limpar apaga tudo", () => {
    recordCategorySignal("Grelhados", NOW);
    clearTasteSignals();
    expect(readTasteEvents()).toEqual([]);
  });
});

describe("perfil de gosto", () => {
  const view = (item: MenuItem, at: number): TasteEvent => ({
    kind: "view",
    at,
    dish: { category: item.category, ingredients: [], restaurantId: item.restaurantId },
  });

  it("um sinal vale metade ao fim de 14 dias", () => {
    const fresh = buildBehaviorProfile({ events: [view(frango, NOW)], now: NOW });
    const old = buildBehaviorProfile({ events: [view(frango, NOW - 14 * DAY)], now: NOW });

    expect(old.categories.get("grelhados")).toBeCloseTo(fresh.categories.get("grelhados")! / 2);
  });

  it("pedidos pesam mais do que pratos vistos; cancelados e recusados não contam", () => {
    const orders = [
      {
        restaurantId: "r1",
        createdAt: new Date(NOW).toISOString(),
        status: "delivered",
        lines: [{ menuItemId: muamba.id }],
      },
      {
        restaurantId: "r2",
        createdAt: new Date(NOW).toISOString(),
        status: "canceled",
        lines: [{ menuItemId: frango.id }],
      },
    ];
    const profile = buildBehaviorProfile({
      events: [view(picanha, NOW)],
      orders,
      items: [muamba, frango, picanha],
      now: NOW,
    });

    expect(profile.categories.get(norm("Pratos Quentes"))).toBe(5);
    expect(profile.categories.get("grelhados")).toBe(2);
    expect(profile.ingredients.has("galinha")).toBe(true);
    expect(profile.ingredients.has("frango")).toBe(false);
  });

  it("pedido de prato que já saiu do catálogo ainda conta para o restaurante", () => {
    const profile = buildBehaviorProfile({
      events: [],
      orders: [
        {
          restaurantId: "r9",
          createdAt: new Date(NOW).toISOString(),
          status: "completed",
          lines: [{ menuItemId: "apagado" }],
        },
      ],
      items: [],
      now: NOW,
    });
    expect(profile.restaurants.get("r9")).toBe(5);
  });

  it("uma pesquisa puxa as categorias dos pratos que encontra", () => {
    const profile = buildBehaviorProfile({
      events: [{ kind: "search", at: NOW, query: "frango" }],
      items: [muamba, frango, picanha],
      now: NOW,
    });

    expect(profile.categories.get("grelhados")).toBe(2);
    expect(profile.categories.has(norm("Pratos Quentes"))).toBe(false);
    expect(profile.ingredients.get("frango")).toBe(2);
  });
});
