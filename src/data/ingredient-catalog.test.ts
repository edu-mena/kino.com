import { describe, expect, it } from "vitest";
import { INGREDIENT_CATALOG } from "./ingredient-catalog";

describe("INGREDIENT_CATALOG", () => {
  it("has no duplicate entries", () => {
    expect(new Set(INGREDIENT_CATALOG).size).toBe(INGREDIENT_CATALOG.length);
  });

  it("has around ~200 curated ingredients", () => {
    expect(INGREDIENT_CATALOG.length).toBeGreaterThan(150);
  });

  it("has no blank entries", () => {
    expect(INGREDIENT_CATALOG.every((i) => i.trim().length > 0)).toBe(true);
  });
});
