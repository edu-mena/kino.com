import { describe, expect, it } from "vitest";
import { averageMenuPrice, priceLevelFromAverage } from "./price-level";

describe("averageMenuPrice", () => {
  it("é 0 para um cardápio vazio", () => {
    expect(averageMenuPrice([])).toBe(0);
  });

  it("média simples dos preços", () => {
    expect(averageMenuPrice([{ price: 2000 }, { price: 4000 }, { price: 6000 }])).toBe(4000);
  });
});

describe("priceLevelFromAverage", () => {
  it("sem cardápio → escalão médio (não marca como económico)", () => {
    expect(priceLevelFromAverage(0)).toBe("Kz Kz");
  });

  it("média baixa → 1 Kz", () => {
    expect(priceLevelFromAverage(3000)).toBe("Kz");
  });

  it("média intermédia → 2 Kz", () => {
    expect(priceLevelFromAverage(6000)).toBe("Kz Kz");
  });

  it("média alta → 3 Kz", () => {
    expect(priceLevelFromAverage(12000)).toBe("Kz Kz Kz");
  });

  it("é monótona nos limiares", () => {
    expect(priceLevelFromAverage(4499)).toBe("Kz");
    expect(priceLevelFromAverage(4500)).toBe("Kz Kz");
    expect(priceLevelFromAverage(7999)).toBe("Kz Kz");
    expect(priceLevelFromAverage(8000)).toBe("Kz Kz Kz");
  });
});
