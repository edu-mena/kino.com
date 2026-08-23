import { describe, expect, it } from "vitest";
import { INITIAL_MENU_ITEMS } from "@/data/mockData";
import { lineUnitPrice } from "./cart";

describe("lineUnitPrice", () => {
  it("returns 0 for a line referencing an unknown menu item", () => {
    expect(
      lineUnitPrice({ key: "x", menuItemId: "does-not-exist", qty: 1, selectedIngredients: [] }),
    ).toBe(0);
  });

  it("returns just the base price when no extras are selected", () => {
    const item = INITIAL_MENU_ITEMS[0]!;
    expect(lineUnitPrice({ key: "x", menuItemId: item.id, qty: 1, selectedIngredients: [] })).toBe(
      item.price,
    );
  });

  it("adds the price of selected extra ingredients", () => {
    const item = INITIAL_MENU_ITEMS.find((m) =>
      m.ingredients.some((i) => (i.extraPrice ?? 0) > 0),
    )!;
    const extra = item.ingredients.find((i) => (i.extraPrice ?? 0) > 0)!;

    const withExtra = lineUnitPrice({
      key: "x",
      menuItemId: item.id,
      qty: 1,
      selectedIngredients: [{ id: extra.id, name: extra.name, included: true }],
    });

    expect(withExtra).toBe(item.price + extra.extraPrice!);
  });

  it("ignores an ingredient that isn't marked as included", () => {
    const item = INITIAL_MENU_ITEMS.find((m) =>
      m.ingredients.some((i) => (i.extraPrice ?? 0) > 0),
    )!;
    const extra = item.ingredients.find((i) => (i.extraPrice ?? 0) > 0)!;

    const withoutExtra = lineUnitPrice({
      key: "x",
      menuItemId: item.id,
      qty: 1,
      selectedIngredients: [{ id: extra.id, name: extra.name, included: false }],
    });

    expect(withoutExtra).toBe(item.price);
  });
});
