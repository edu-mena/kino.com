import { describe, expect, it } from "vitest";
import { groupByRecency, latestIsoDate, recencyBucket } from "./recency-groups";

// Quarta-feira, 30 de setembro de 2026, 15:00 (hora local).
const NOW = new Date(2026, 8, 30, 15, 0);
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h);

describe("recencyBucket", () => {
  it.each([
    [at(2026, 9, 30, 0), "today"],
    [at(2026, 10, 1), "today"], // relógio atrasado → futuro conta como hoje
    [at(2026, 9, 29, 23), "yesterday"],
    [at(2026, 9, 28, 8), "earlierThisWeek"], // segunda desta semana
    [at(2026, 9, 27), "lastWeek"], // domingo
    [at(2026, 9, 21), "lastWeek"], // segunda da semana passada
    [at(2026, 9, 20), "earlierThisMonth"],
    [at(2026, 9, 1), "earlierThisMonth"],
    [at(2026, 8, 31), "lastMonth"],
    [at(2026, 8, 1), "lastMonth"],
    [at(2026, 7, 31), "earlierThisYear"],
    [at(2026, 1, 1, 0), "earlierThisYear"],
    [at(2025, 12, 31), "lastYear"],
    [at(2025, 1, 1, 0), "lastYear"],
    [at(2024, 12, 31), "older"],
  ] as const)("%s → %s", (date, bucket) => {
    expect(recencyBucket(date, NOW)).toBe(bucket);
  });

  it("semana passada que começa no mês passado ganha a 'mês passado'", () => {
    // Quinta, 3 de setembro: a semana passada vai de 24 a 30 de agosto.
    const now = new Date(2026, 8, 3, 10);
    expect(recencyBucket(at(2026, 8, 25), now)).toBe("lastWeek");
    expect(recencyBucket(at(2026, 8, 20), now)).toBe("lastMonth");
  });
});

describe("groupByRecency", () => {
  it("agrupa pela ordem dos baldes, preserva a ordem de entrada e omite vazios", () => {
    const items = [
      { id: "a", d: at(2026, 9, 30) },
      { id: "b", d: at(2025, 3, 1) },
      { id: "c", d: at(2026, 9, 30, 9) },
      { id: "d", d: at(2026, 9, 29) },
    ];
    const groups = groupByRecency(items, (i) => i.d, NOW);
    expect(groups.map((g) => [g.bucket, g.items.map((i) => i.id)])).toEqual([
      ["today", ["a", "c"]],
      ["yesterday", ["d"]],
      ["lastYear", ["b"]],
    ]);
  });
});

describe("latestIsoDate", () => {
  it("devolve a mais recente e ignora ausentes/inválidas", () => {
    expect(
      latestIsoDate(
        "2026-09-01T10:00:00Z",
        undefined,
        "lixo",
        "2026-09-02T10:00:00Z",
      ).toISOString(),
    ).toBe("2026-09-02T10:00:00.000Z");
  });
});
