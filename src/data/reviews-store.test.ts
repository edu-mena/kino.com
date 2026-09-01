import { describe, expect, it } from "vitest";
import { blendedRating, getEffectiveReviews, isRefReviewed } from "./reviews-store";
import { INITIAL_REVIEWS } from "./mockData";

// Ambiente de teste é "node" (sem `window`) — as stores locais devolvem
// sempre o estado vazio, por isso o comportamento aqui é o de passthrough
// puro sobre o seed. A escrita/leitura via localStorage é exercida
// manualmente na app (o browser tem `window`).
describe("reviews-store (sem localStorage)", () => {
  it("getEffectiveReviews devolve o seed quando não há avaliações custom", () => {
    expect(getEffectiveReviews()).toEqual(INITIAL_REVIEWS);
  });

  it("blendedRating devolve os valores originais sem avaliações custom", () => {
    expect(blendedRating("rest-1", 4.5, 10)).toEqual({ rating: 4.5, reviewCount: 10 });
  });

  it("isRefReviewed é sempre false sem estado guardado", () => {
    expect(isRefReviewed("order:123")).toBe(false);
  });
});
