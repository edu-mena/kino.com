import { describe, expect, it } from "vitest";
import { resolvePromoCode, sanitizePromoCode } from "./offers-store";

// Ambiente "node" (sem `window`) — `getEffectiveOffers()` é passthrough do
// seed `INITIAL_OFFERS`, por isso aqui testa-se contra as promoções Luku.
describe("resolvePromoCode", () => {
  it("resolve um código de desconto para a percentagem do seed", () => {
    expect(resolvePromoCode("rest-1", "LUKU20")).toMatchObject({
      code: "LUKU20",
      percentOff: 20,
      freeDelivery: false,
    });
  });

  it("é case-insensitive e ignora espaços", () => {
    expect(resolvePromoCode("rest-1", "  luku20 ")?.percentOff).toBe(20);
  });

  it("um código de entrega grátis não desconta mas isenta a taxa", () => {
    expect(resolvePromoCode("rest-1", "LUKUFRETE")).toMatchObject({
      percentOff: 0,
      freeDelivery: true,
    });
  });

  it("devolve null para código inexistente", () => {
    expect(resolvePromoCode("rest-1", "NAOEXISTE")).toBeNull();
  });

  it("devolve null para código vazio", () => {
    expect(resolvePromoCode("rest-1", "   ")).toBeNull();
  });
});

describe("sanitizePromoCode", () => {
  it.each([
    ["luku 20", "LUKU20"],
    ["Verão-2026", "VERAO-2026"],
    ["black_friday!", "BLACK_FRIDAY"],
    ["  frete grátis ", "FRETEGRATIS"],
  ])("%s → %s", (raw, clean) => {
    expect(sanitizePromoCode(raw)).toBe(clean);
  });

  it("corta em 40 caracteres (limite do backend)", () => {
    expect(sanitizePromoCode("A".repeat(60))).toHaveLength(40);
  });
});
