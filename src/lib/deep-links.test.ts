import { describe, expect, it } from "vitest";
import { lukuPathFrom } from "./deep-links";

describe("lukuPathFrom", () => {
  it("abre dentro da app os links da Luku (QR da mesa, cardápio, restaurante)", () => {
    expect(lukuPathFrom("https://luku.ao/q/AB12CD")).toBe("/q/AB12CD");
    expect(lukuPathFrom("https://www.luku.ao/menu/abc?mesa=3#top")).toBe("/menu/abc?mesa=3#top");
    expect(lukuPathFrom("  luku.ao/restaurantes/xyz ")).toBe("/restaurantes/xyz");
    expect(lukuPathFrom("https://LUKU.AO")).toBe("/");
  });

  it("nunca abre links de outros sites nem esquemas estranhos", () => {
    expect(lukuPathFrom("https://luku.ao.evil.com/q/1")).toBeNull();
    expect(lukuPathFrom("https://exemplo.com/luku.ao")).toBeNull();
    expect(lukuPathFrom("javascript:alert(1)")).toBeNull();
    expect(lukuPathFrom("WIFI:S:rede;T:WPA;P:senha;;")).toBeNull();
    expect(lukuPathFrom("")).toBeNull();
  });
});
