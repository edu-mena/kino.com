import { describe, expect, it } from "vitest";
import {
  canDeliverToNeighborhood,
  getAllIngredientNames,
  getCommonIngredients,
  getDeliveryZones,
  getMenuCategories,
  getMenuItem,
  getMenuItemsByRestaurant,
  getNeighborhoods,
  getRestaurant,
  getRestaurantsOfferingDish,
  getRestaurantsWithStories,
  getStoriesForRestaurant,
} from "./helpers";
import { INITIAL_MENU_ITEMS, INITIAL_RESTAURANTS } from "./mockData";

describe("getRestaurant / getMenuItem", () => {
  it("finds a restaurant by id", () => {
    const first = INITIAL_RESTAURANTS[0]!;
    expect(getRestaurant(first.id)).toEqual(first);
  });

  it("returns undefined for an unknown restaurant id", () => {
    expect(getRestaurant("does-not-exist")).toBeUndefined();
  });

  it("finds a menu item by id", () => {
    const first = INITIAL_MENU_ITEMS[0]!;
    // Itens do seed não têm `menuId` explícito — a leitura resolve-o para o
    // cardápio principal sintético do restaurante (ver `@/data/menus-store`).
    expect(getMenuItem(first.id)).toEqual({
      ...first,
      menuId: `menu-default-${first.restaurantId}`,
    });
  });

  it("returns undefined for an unknown menu item id", () => {
    expect(getMenuItem("does-not-exist")).toBeUndefined();
  });
});

describe("getMenuItemsByRestaurant", () => {
  it("only returns items belonging to the given restaurant", () => {
    const restaurantId = INITIAL_MENU_ITEMS[0]!.restaurantId;
    const items = getMenuItemsByRestaurant(restaurantId);
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => item.restaurantId === restaurantId)).toBe(true);
  });

  it("returns an empty array for a restaurant with no items", () => {
    expect(getMenuItemsByRestaurant("does-not-exist")).toEqual([]);
  });
});

describe("getRestaurantsOfferingDish / getCommonIngredients", () => {
  it("finds a dish shared by more than one restaurant and excludes the given one", () => {
    // Find a dish name that appears in at least two restaurants — the
    // mock data seeds a few on purpose so this feature has something to show.
    const counts = new Map<string, string[]>();
    for (const item of INITIAL_MENU_ITEMS) {
      counts.set(item.name, [...(counts.get(item.name) ?? []), item.restaurantId]);
    }
    const [dishName, restaurantIds] = [...counts.entries()].find(([, ids]) => ids.length > 1)!;
    const excluded = restaurantIds[0]!;

    const others = getRestaurantsOfferingDish(dishName, excluded);
    expect(others.every((r) => r.id !== excluded)).toBe(true);
    expect(others.length).toBeGreaterThan(0);
  });

  it("returns an empty list for a dish name that doesn't exist", () => {
    expect(getRestaurantsOfferingDish("prato-inexistente")).toEqual([]);
    expect(getCommonIngredients("prato-inexistente")).toEqual([]);
  });
});

describe("getMenuCategories / getAllIngredientNames / getNeighborhoods", () => {
  it("returns unique, non-empty category names", () => {
    const categories = getMenuCategories();
    expect(categories.length).toBeGreaterThan(0);
    expect(new Set(categories).size).toBe(categories.length);
  });

  it("returns unique ingredient names, sorted", () => {
    const names = getAllIngredientNames();
    expect(names.length).toBeGreaterThan(0);
    expect(new Set(names).size).toBe(names.length);
    expect([...names].sort((a, b) => a.localeCompare(b, "pt"))).toEqual(names);
  });

  it("returns unique neighborhood names", () => {
    const neighborhoods = getNeighborhoods();
    expect(neighborhoods.length).toBeGreaterThan(0);
    expect(new Set(neighborhoods).size).toBe(neighborhoods.length);
  });
});

describe("getDeliveryZones / canDeliverToNeighborhood", () => {
  it("returns no zones for a restaurant with no delivery", () => {
    const restaurant = INITIAL_RESTAURANTS.find((r) => !r.isDeliveryAvailable);
    expect(restaurant).toBeDefined();
    expect(getDeliveryZones(restaurant!)).toEqual([]);
    expect(canDeliverToNeighborhood(restaurant!, restaurant!.neighborhood)).toBe(false);
    expect(canDeliverToNeighborhood(restaurant!)).toBe(false);
  });

  it("falls back to the restaurant's own neighborhood when no explicit zones are set", () => {
    const restaurant = INITIAL_RESTAURANTS.find((r) => r.isDeliveryAvailable && !r.deliveryZones);
    expect(restaurant).toBeDefined();
    expect(getDeliveryZones(restaurant!)).toEqual([restaurant!.neighborhood]);
    expect(canDeliverToNeighborhood(restaurant!, restaurant!.neighborhood)).toBe(true);
  });

  it("only delivers to neighborhoods in its explicit zone list", () => {
    const restaurant = INITIAL_RESTAURANTS.find(
      (r) => r.isDeliveryAvailable && r.deliveryZones && r.deliveryZones.length > 0,
    );
    expect(restaurant).toBeDefined();
    const zones = getDeliveryZones(restaurant!);
    expect(zones).toEqual(restaurant!.deliveryZones);
    for (const zone of zones) {
      expect(canDeliverToNeighborhood(restaurant!, zone)).toBe(true);
    }
    expect(canDeliverToNeighborhood(restaurant!, "Bairro Inexistente")).toBe(false);
  });
});

describe("stories helpers", () => {
  it("orders a restaurant's stories oldest first", () => {
    const withStories = getRestaurantsWithStories();
    if (withStories.length === 0) return; // no seeded stories — nothing to assert
    const stories = getStoriesForRestaurant(withStories[0]!.id);
    const times = stories.map((s) => new Date(s.createdAt).getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it("orders restaurants with stories by most recent story first", () => {
    const withStories = getRestaurantsWithStories();
    if (withStories.length < 2) return;
    const latestTimes = withStories.map((r) =>
      Math.max(...getStoriesForRestaurant(r.id).map((s) => new Date(s.createdAt).getTime())),
    );
    expect(latestTimes).toEqual([...latestTimes].sort((a, b) => b - a));
  });
});
