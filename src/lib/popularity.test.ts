import { describe, expect, it } from "vitest";
import {
  adjustedRating,
  byDishPopularity,
  byPopularity,
  categoriesByCount,
  topCategories,
} from "./popularity";

const restaurant = (name: string, extra: Partial<Record<string, number>> = {}) => ({
  name,
  rating: 0,
  reviewCount: 0,
  ...extra,
});

describe("popularidade de restaurantes", () => {
  it("poucas avaliações puxam a nota para perto da média", () => {
    expect(adjustedRating({ rating: 5, reviewCount: 1 })).toBeLessThan(
      adjustedRating({ rating: 4.6, reviewCount: 80 }),
    );
    expect(adjustedRating({ rating: 0, reviewCount: 0 })).toBe(4);
  });

  it("pedidos recentes pesam mais do que seguidores, e estes mais do que a nota", () => {
    const list = [
      restaurant("Só nota", { rating: 5, reviewCount: 200 }),
      restaurant("Seguido", { followersCount: 20 }),
      restaurant("Muito pedido", { recentOrdersCount: 15 }),
    ];
    expect([...list].sort(byPopularity).map((r) => r.name)).toEqual([
      "Muito pedido",
      "Seguido",
      "Só nota",
    ]);
  });

  it("empate decide pelo nome", () => {
    const list = [restaurant("Zé"), restaurant("Ana")];
    expect([...list].sort(byPopularity).map((r) => r.name)).toEqual(["Ana", "Zé"]);
  });
});

describe("popularidade de pratos", () => {
  it("mais pedidos primeiro, depois promoção, depois nome", () => {
    const dishes = [
      { name: "B", orderCount: 2, isPromoted: false },
      { name: "A", orderCount: 2, isPromoted: false },
      { name: "C", orderCount: 2, isPromoted: true },
      { name: "D", orderCount: 9, isPromoted: false },
    ];
    expect([...dishes].sort(byDishPopularity).map((d) => d.name)).toEqual(["D", "C", "A", "B"]);
  });
});

describe("categorias", () => {
  const items = [
    ...Array.from({ length: 5 }, () => ({ category: "Grelhados" })),
    ...Array.from({ length: 3 }, () => ({ category: "Bebidas" })),
    ...Array.from({ length: 3 }, () => ({ category: "Acompanhamentos" })),
    ...Array.from({ length: 2 }, () => ({ category: "Sobremesas" })),
    { category: "" },
  ];

  it("ordena pelo nº de pratos, empate por nome, sem categoria vazia", () => {
    expect(categoriesByCount(items)).toEqual([
      { category: "Grelhados", count: 5 },
      { category: "Acompanhamentos", count: 3 },
      { category: "Bebidas", count: 3 },
      { category: "Sobremesas", count: 2 },
    ]);
  });

  it("as secções da home são as maiores com um mínimo de pratos", () => {
    expect(topCategories(items)).toEqual(["Grelhados", "Acompanhamentos", "Bebidas"]);
    expect(topCategories(items, 3, 4)).toEqual(["Grelhados"]);
  });
});
