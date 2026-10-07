// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import type { MenuItem, Restaurant } from "./types";

// Com backend real (produção): os helpers síncronos nunca podem devolver o
// mock — era daí que vinham restaurantes falsos ("rest-1") que davam 404.
vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api-client")>()),
  hasRealBackend: true,
}));

const { rememberMenuItems, rememberRestaurants } = await import("./live-catalog");
const helpers = await import("./helpers");

const restaurant = (id: string, cuisine: string) =>
  ({ id, name: `Restaurante ${id}`, cuisine, neighborhood: "Talatona" }) as Restaurant;
const dish = (id: string, restaurantId: string, name: string, ingredients: string[]) =>
  ({
    id,
    restaurantId,
    name,
    category: "Pratos principais",
    ingredients: ingredients.map((n) => ({ name: n })),
  }) as unknown as MenuItem;

describe("helpers com backend real", () => {
  it("antes da API responder, não inventam nada a partir do mock", () => {
    expect(helpers.getRestaurant("rest-1")).toBeUndefined();
    expect(helpers.getAllRestaurants()).toEqual([]);
    expect(helpers.getMenuItem("item-1")).toBeUndefined();
  });

  it("respondem com o que a API devolveu", () => {
    rememberRestaurants([restaurant("uuid-a", "Angolana"), restaurant("uuid-b", "Italiana")]);
    rememberMenuItems([
      dish("d1", "uuid-a", "Muamba", ["Galinha", "Quiabo"]),
      dish("d2", "uuid-b", "Muamba", ["Galinha", "Dendém"]),
    ]);

    expect(helpers.getRestaurant("uuid-a")?.name).toBe("Restaurante uuid-a");
    expect(helpers.getAllRestaurants().map((r) => r.id)).toEqual(["uuid-a", "uuid-b"]);
    expect(helpers.getCuisines()).toEqual(["Angolana", "Italiana"]);
    expect(helpers.getMenuItem("d2")?.restaurantId).toBe("uuid-b");
    expect(helpers.getRestaurantsOfferingDish("Muamba", "uuid-a").map((r) => r.id)).toEqual([
      "uuid-b",
    ]);
    expect(helpers.getCommonIngredients("Muamba")).toEqual(["Galinha"]);
    expect(helpers.getAllIngredientNames()).toEqual(["Dendém", "Galinha", "Quiabo"]);
  });
});

describe("cardápio completo em memória", () => {
  it("só conta depois de marcado e enquanto for recente", async () => {
    const { hasFreshFullMenuCatalog, markFullMenuCatalog } = await import("./live-catalog");
    vi.useFakeTimers();
    try {
      expect(hasFreshFullMenuCatalog(60_000)).toBe(false);
      markFullMenuCatalog();
      expect(hasFreshFullMenuCatalog(60_000)).toBe(true);
      vi.advanceTimersByTime(61_000);
      expect(hasFreshFullMenuCatalog(60_000)).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
