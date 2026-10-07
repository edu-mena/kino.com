import { describe, expect, it } from "vitest";
import { PAGE_GAP as G, pageSlotsForWidth, paginationRange } from "./pagination-range";

describe("paginationRange", () => {
  it("mostra todas as páginas quando cabem", () => {
    expect(paginationRange(2, 5, 7)).toEqual([1, 2, 3, 4, 5]);
    expect(paginationRange(1, 7, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("perto do início: bloco inicial + lacuna + última", () => {
    expect(paginationRange(1, 20, 7)).toEqual([1, 2, 3, 4, 5, G, 20]);
    expect(paginationRange(4, 20, 7)).toEqual([1, 2, 3, 4, 5, G, 20]);
  });

  it("no meio: janela centrada na atual com lacunas dos dois lados", () => {
    expect(paginationRange(5, 20, 7)).toEqual([1, G, 4, 5, 6, G, 20]);
    expect(paginationRange(10, 20, 9)).toEqual([1, G, 8, 9, 10, 11, 12, G, 20]);
  });

  it("perto do fim: primeira + lacuna + bloco final", () => {
    expect(paginationRange(17, 20, 7)).toEqual([1, G, 16, 17, 18, 19, 20]);
    expect(paginationRange(20, 20, 7)).toEqual([1, G, 16, 17, 18, 19, 20]);
  });

  it("nunca passa do número de posições e inclui sempre a atual", () => {
    for (const slots of [5, 6, 7, 8, 9]) {
      for (const total of [slots + 1, 12, 40]) {
        for (let page = 1; page <= total; page += 1) {
          const range = paginationRange(page, total, slots);
          expect(range.length).toBeLessThanOrEqual(slots);
          expect(range).toContain(page);
          expect(range[0]).toBe(1);
          expect(range.at(-1)).toBe(total);
        }
      }
    }
  });

  it("uma lacuna esconde sempre pelo menos duas páginas", () => {
    for (let page = 1; page <= 12; page += 1) {
      const range = paginationRange(page, 12, 7);
      range.forEach((slot, i) => {
        if (slot !== G) return;
        const before = range[i - 1] as number;
        const after = range[i + 1] as number;
        expect(after - before).toBeGreaterThanOrEqual(3);
      });
    }
  });

  it("sem espaço para 1 … n … última, fica só a atual", () => {
    expect(paginationRange(6, 20, 4)).toEqual([6]);
  });
});

describe("pageSlotsForWidth", () => {
  it("desconta as setas e respeita o máximo", () => {
    // 360px de ecrã − 32px de margens = 328px → 7 botões de 36px+8px, 2 são setas.
    expect(pageSlotsForWidth(328)).toBe(5);
    expect(pageSlotsForWidth(2000)).toBe(9);
    expect(pageSlotsForWidth(0)).toBe(1);
  });
});
