import { describe, expect, it } from "vitest";
import type { MenuItem } from "@/data/types";
import {
  dailySeed,
  dishBehaviorScore,
  personalPopularity,
  personalizedCategories,
  personalizedTopCategories,
  profileConfidence,
  rankSectionDishes,
  rotationJitter,
} from "./personalize";
import { buildBehaviorProfile, emptyProfile, type TasteEvent } from "./taste-signals";

const NOW = Date.UTC(2026, 9, 7, 12);

function dish(
  id: string,
  category: string,
  extra: Partial<MenuItem> = {},
  restaurantId = "r1",
): MenuItem {
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
    ingredients: [],
    ...extra,
  };
}

const menu = [
  ...Array.from({ length: 6 }, (_, i) => dish(`bebida-${i}`, "Bebidas")),
  ...Array.from({ length: 4 }, (_, i) => dish(`grelhado-${i}`, "Grelhados", {}, "r2")),
  ...Array.from({ length: 3 }, (_, i) => dish(`sobremesa-${i}`, "Sobremesas")),
  ...Array.from({ length: 3 }, (_, i) => dish(`entrada-${i}`, "Entradas")),
];

const views = (category: string, n: number, restaurantId = "r2"): TasteEvent[] =>
  Array.from({ length: n }, () => ({
    kind: "view" as const,
    at: NOW,
    dish: { category, ingredients: [], restaurantId },
  }));

describe("categorias pela ordem do cliente", () => {
  it("sem histórico fica a ordem por nº de pratos", () => {
    expect(personalizedTopCategories(menu, emptyProfile())).toEqual([
      "Bebidas",
      "Grelhados",
      "Entradas",
    ]);
  });

  it("quem abre muitos grelhados vê Grelhados primeiro", () => {
    const profile = buildBehaviorProfile({ events: views("Grelhados", 5), now: NOW });
    expect(personalizedCategories(menu, profile)[0]!.category).toBe("Grelhados");
  });

  it("uma categoria preferida entra nas secções mesmo não sendo das maiores", () => {
    const profile = buildBehaviorProfile({ events: views("Sobremesas", 5), now: NOW });
    expect(personalizedTopCategories(menu, profile)).toContain("Sobremesas");
  });

  it("um único prato aberto pesa pouco (confiança proporcional)", () => {
    const profile = buildBehaviorProfile({ events: views("Sobremesas", 1), now: NOW });
    expect(profileConfidence(profile)).toBeCloseTo(0.2);
    expect(personalizedTopCategories(menu, profile)[0]).toBe("Bebidas");
  });
});

describe("afinidade de um prato", () => {
  it("sem histórico é zero; com histórico, a categoria preferida pontua", () => {
    const grelhado = menu.find((d) => d.category === "Grelhados")!;
    expect(dishBehaviorScore(grelhado, emptyProfile())).toBe(0);
    const profile = buildBehaviorProfile({ events: views("Grelhados", 5), now: NOW });
    expect(dishBehaviorScore(grelhado, profile)).toBeGreaterThan(
      dishBehaviorScore(menu[0]!, profile),
    );
  });
});

describe("variação diária", () => {
  it("a mesma pessoa no mesmo dia vê sempre a mesma ordem", () => {
    const seed = dailySeed("ana", new Date(NOW));
    const a = rankSectionDishes(menu, emptyProfile(), seed).map((d) => d.id);
    const b = rankSectionDishes(menu, emptyProfile(), seed).map((d) => d.id);
    expect(a).toEqual(b);
  });

  it("noutro dia a ordem de pratos equivalentes muda", () => {
    const today = rankSectionDishes(menu, emptyProfile(), dailySeed("ana", new Date(NOW)));
    const tomorrow = rankSectionDishes(
      menu,
      emptyProfile(),
      dailySeed("ana", new Date(NOW + 86_400_000)),
    );
    expect(today.map((d) => d.id)).not.toEqual(tomorrow.map((d) => d.id));
    expect(rotationJitter("x", "1")).toBeGreaterThanOrEqual(0);
    expect(rotationJitter("x", "1")).toBeLessThanOrEqual(1);
  });

  it("a variação não passa por cima de um prato muito mais pedido", () => {
    const list = [dish("calmo", "Grelhados"), dish("famoso", "Grelhados", { orderCount: 40 })];
    for (let day = 0; day < 10; day += 1) {
      const seed = dailySeed("ana", new Date(NOW + day * 86_400_000));
      expect(rankSectionDishes(list, emptyProfile(), seed)[0]!.id).toBe("famoso");
    }
  });
});

describe("restaurantes populares para o cliente", () => {
  const base = { rating: 4.5, reviewCount: 20, followersCount: 0, name: "" };
  it("onde o cliente já encomendou sobe acima de um um pouco mais popular", () => {
    const popular = { ...base, id: "popular", name: "Popular", recentOrdersCount: 4 };
    const mine = { ...base, id: "mine", name: "Meu", recentOrdersCount: 0 };
    const profile = buildBehaviorProfile({
      events: [],
      orders: [
        {
          restaurantId: "mine",
          createdAt: new Date(NOW).toISOString(),
          status: "delivered",
          lines: [],
        },
        {
          restaurantId: "mine",
          createdAt: new Date(NOW).toISOString(),
          status: "delivered",
          lines: [],
        },
      ],
      now: NOW,
    });

    expect(personalPopularity(mine, emptyProfile())).toBeLessThan(
      personalPopularity(popular, emptyProfile()),
    );
    expect(personalPopularity(mine, profile)).toBeGreaterThan(personalPopularity(popular, profile));
  });
});
