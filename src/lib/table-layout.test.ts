import { describe, expect, it } from "vitest";
import type { RestaurantTable, TableCombination } from "@/data/tables-store";
import {
  addDaysIso,
  buildDayUnits,
  dayCapacity,
  suggestCombination,
  unitKeyFor,
  unitOfTable,
} from "./table-layout";

const table = (
  id: string,
  seats: number,
  extra: Partial<RestaurantTable> = {},
): RestaurantTable => ({
  id,
  restaurantId: "r1",
  name: `Mesa ${id}`,
  seats,
  area: "Interior",
  ...extra,
});

const tables = [
  table("1", 2, { sortOrder: 1 }),
  table("2", 4, { sortOrder: 2 }),
  table("3", 4, { sortOrder: 3 }),
  table("4", 6, { sortOrder: 4, isActive: false }),
  table("5", 4, { sortOrder: 5, area: "Esplanada" }),
];

const combo = (
  id: string,
  date: string,
  tableIds: string[],
  seats: number,
  label?: string,
): TableCombination => ({
  id,
  restaurantId: "r1",
  date,
  tableIds,
  seats,
  ...(label ? { label } : {}),
});

describe("buildDayUnits", () => {
  it("lista só mesas em serviço, pela ordem da sala", () => {
    const units = buildDayUnits(tables, [], "2026-10-20");
    expect(units.map((u) => u.name)).toEqual(["Mesa 1", "Mesa 2", "Mesa 3", "Mesa 5"]);
    expect(dayCapacity(units)).toEqual({ units: 4, tables: 4, seats: 14, combinations: 0 });
  });

  it("junção do dia vira uma unidade com a capacidade dada, no lugar da 1.ª mesa", () => {
    const units = buildDayUnits(tables, [combo("c1", "2026-10-20", ["2", "3"], 6)], "2026-10-20");
    expect(units.map((u) => u.name)).toEqual(["Mesa 1", "Mesa 2 + Mesa 3", "Mesa 5"]);
    const joined = units[1]!;
    expect(joined.kind).toBe("combo");
    expect(joined.anchorTableId).toBe("2");
    expect(dayCapacity(units)).toEqual({ units: 3, tables: 4, seats: 12, combinations: 1 });
  });

  it("junção de outro dia não conta; rótulo do staff tem prioridade", () => {
    const combos = [
      combo("c1", "2026-10-21", ["2", "3"], 6),
      combo("c2", "2026-10-20", ["1", "2"], 6, "Aniversário"),
    ];
    const units = buildDayUnits(tables, combos, "2026-10-20");
    expect(units.map((u) => u.name)).toEqual(["Aniversário", "Mesa 3", "Mesa 5"]);
  });

  it("junção que ficaria com uma mesa só (outra fora de serviço) desfaz-se", () => {
    const units = buildDayUnits(tables, [combo("c1", "2026-10-20", ["3", "4"], 10)], "2026-10-20");
    expect(units.every((u) => u.kind === "table")).toBe(true);
  });
});

describe("unitKeyFor / unitOfTable", () => {
  it("duas mesas da mesma junção dão a mesma unidade nesse dia", () => {
    const combos = [combo("c1", "2026-10-20", ["2", "3"], 6)];
    expect(unitKeyFor("2", "2026-10-20", combos)).toBe(unitKeyFor("3", "2026-10-20", combos));
    expect(unitKeyFor("2", "2026-10-21", combos)).toBe("t:2");
    const units = buildDayUnits(tables, combos, "2026-10-20");
    expect(unitOfTable(units, "3")?.key).toBe("c:c1");
    expect(unitOfTable(units, undefined)).toBeUndefined();
  });
});

describe("suggestCombination", () => {
  it("junta o mínimo de mesas da mesma zona e desperdiça pouco", () => {
    const free = [
      table("a", 4),
      table("b", 4),
      table("c", 2),
      table("d", 6, { area: "Esplanada" }),
    ];
    const pick = suggestCombination(6, free);
    expect(pick?.map((t) => t.id).sort()).toEqual(["a", "c"]);
  });

  it("ignora mesas que não podem ser juntas e devolve null se não chega", () => {
    const free = [table("a", 4, { isCombinable: false }), table("b", 4)];
    expect(suggestCombination(6, free)).toBeNull();
  });
});

describe("addDaysIso", () => {
  it("atravessa o fim do mês", () => {
    expect(addDaysIso("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDaysIso("2026-11-01", -1)).toBe("2026-10-31");
  });
});
