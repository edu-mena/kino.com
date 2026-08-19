import { INITIAL_MENU_ITEMS, INITIAL_RESTAURANTS } from "./mockData";
import type { MenuItem, Restaurant } from "./types";

export function getRestaurant(id: string): Restaurant | undefined {
  return INITIAL_RESTAURANTS.find((r) => r.id === id);
}

export function getMenuItem(id: string): MenuItem | undefined {
  return INITIAL_MENU_ITEMS.find((m) => m.id === id);
}

export function getMenuItemsByRestaurant(restaurantId: string): MenuItem[] {
  return INITIAL_MENU_ITEMS.filter((m) => m.restaurantId === restaurantId);
}

/** Outros restaurantes (além do informado) que têm um prato com o mesmo nome. */
export function getRestaurantsOfferingDish(
  dishName: string,
  excludeRestaurantId?: string,
): Restaurant[] {
  const restaurantIds = new Set(
    INITIAL_MENU_ITEMS.filter(
      (m) => m.name === dishName && m.restaurantId !== excludeRestaurantId,
    ).map((m) => m.restaurantId),
  );
  return INITIAL_RESTAURANTS.filter((r) => restaurantIds.has(r.id));
}

/** Ingredientes que aparecem em todas as versões (por nome) deste prato entre restaurantes. */
export function getCommonIngredients(dishName: string): string[] {
  const versions = INITIAL_MENU_ITEMS.filter((m) => m.name === dishName);
  if (versions.length === 0) return [];
  const [first, ...rest] = versions;
  let common = new Set(first!.ingredients.map((i) => i.name));
  for (const v of rest) {
    const names = new Set(v.ingredients.map((i) => i.name));
    common = new Set([...common].filter((n) => names.has(n)));
  }
  return [...common];
}

export function getMenuCategories(): string[] {
  return [...new Set(INITIAL_MENU_ITEMS.map((m) => m.category))];
}
