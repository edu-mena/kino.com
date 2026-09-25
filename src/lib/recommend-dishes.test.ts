import { describe, expect, it } from "vitest";
import type { MenuItem } from "@/data/types";
import { buildRecommendedDishes, buildTasteProfile, tasteAffinity } from "./recommend-dishes";

function item(id: string, restaurantId: string, category: string, ingredients: string[]): MenuItem {
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

const camaraoA = item("camarao-a", "r1", "Mariscos", ["Camarão", "Alho", "Limão"]);
const camaraoB = item("camarao-b", "r2", "Mariscos", ["camarao", "Piri-piri"]);
const frango = item("frango", "r3", "Grelhados", ["Frango", "Batata"]);
const sumo = item("sumo", "r3", "Sumos", ["Maracujá"]);

const base = {
  getCuisine: () => undefined,
  distanceKmOf: () => 5,
  cuisinePreferences: [],
  excludedIngredients: [],
  dietaryRestrictions: [],
  ownListReason: "",
};

describe("perfil de gosto dos favoritos", () => {
  it("sem favoritos não mexe na pontuação", () => {
    const profile = buildTasteProfile([camaraoA, frango]);
    expect(tasteAffinity(frango, profile)).toBe(0);
  });

  it("ingredientes em comum contam, sem diferença de acentos/maiúsculas", () => {
    const profile = buildTasteProfile([camaraoA, camaraoB, frango], ["camarao-a"]);
    expect(tasteAffinity(camaraoB, profile)).toBeGreaterThan(tasteAffinity(frango, profile));
  });

  it("ingrediente favorito explícito em Preferências também conta", () => {
    const profile = buildTasteProfile([frango, sumo], [], ["maracujá"]);
    expect(tasteAffinity(sumo, profile)).toBeGreaterThan(0);
    expect(tasteAffinity(frango, profile)).toBe(0);
  });

  it("recomendações sobem pratos parecidos com os favoritos", () => {
    const withoutFavs = buildRecommendedDishes({ ...base, items: [frango, camaraoB, sumo] });
    const withFavs = buildRecommendedDishes({
      ...base,
      items: [frango, camaraoB, sumo],
      profileItems: [camaraoA, frango, camaraoB, sumo],
      favoriteItemIds: ["camarao-a"],
    });
    expect(withoutFavs[0]?.id).not.toBe("camarao-b");
    expect(withFavs[0]?.id).toBe("camarao-b");
  });
});
