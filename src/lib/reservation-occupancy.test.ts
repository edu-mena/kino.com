import { describe, expect, it } from "vitest";
import { findOverbookings, overlaps, suggestTable, windowOccupancy } from "./reservation-occupancy";
import type { Reservation } from "@/data/types";

function makeResv(over: Partial<Reservation> & Pick<Reservation, "id">): Reservation {
  return {
    restaurantId: "rest-1",
    restaurantName: "Bistrô",
    restaurantImage: "",
    customerName: "Cliente",
    customerPhone: "",
    customerEmail: "",
    date: "2026-01-05",
    time: "19:00",
    peopleCount: 2,
    cautionAmount: 0,
    cautionStatus: "",
    status: "Confirmada",
    createdAt: "2026-01-01T10:00:00",
    ...over,
  };
}

describe("overlaps", () => {
  it("duas reservas na mesma data dentro da janela sobrepõem-se", () => {
    const a = makeResv({ id: "a", time: "19:00" });
    const b = makeResv({ id: "b", time: "20:30" });
    expect(overlaps(a, b, 120)).toBe(true);
  });

  it("fora da janela não se sobrepõem", () => {
    const a = makeResv({ id: "a", time: "19:00" });
    const b = makeResv({ id: "b", time: "22:00" });
    expect(overlaps(a, b, 120)).toBe(false);
  });

  it("datas diferentes nunca se sobrepõem", () => {
    const a = makeResv({ id: "a", date: "2026-01-05", time: "19:00" });
    const b = makeResv({ id: "b", date: "2026-01-06", time: "19:00" });
    expect(overlaps(a, b, 120)).toBe(false);
  });
});

describe("windowOccupancy", () => {
  it("dois grupos pequenos cabem numa sala grande sem sobre-reserva", () => {
    const a = makeResv({ id: "a", time: "19:00", peopleCount: 4 });
    const b = makeResv({ id: "b", time: "19:30", peopleCount: 4 });
    const occ = windowOccupancy(a, [a, b], 120, 40, 10);
    expect(occ.seats).toBe(8);
    expect(occ.overbooked).toBe(false);
  });

  it("excede os lugares totais → sobre-reserva", () => {
    const a = makeResv({ id: "a", time: "19:00", peopleCount: 20 });
    const b = makeResv({ id: "b", time: "19:30", peopleCount: 20 });
    const occ = windowOccupancy(a, [a, b], 120, 30, 10);
    expect(occ.seatsOver).toBe(true);
    expect(occ.overbooked).toBe(true);
  });

  it("duas reservas na mesma mesa entram em choque mesmo com lugares livres", () => {
    const a = makeResv({ id: "a", time: "19:00", peopleCount: 2, tableId: "t1" });
    const b = makeResv({ id: "b", time: "19:30", peopleCount: 2, tableId: "t1" });
    const occ = windowOccupancy(a, [a, b], 120, 100, 10);
    expect(occ.tableClash).toBe(true);
    expect(occ.overbooked).toBe(true);
  });
});

describe("findOverbookings", () => {
  it("só devolve grupos realmente sobre-reservados", () => {
    const ok = makeResv({ id: "ok", time: "12:00", peopleCount: 2 });
    const a = makeResv({ id: "a", time: "19:00", peopleCount: 20 });
    const b = makeResv({ id: "b", time: "19:30", peopleCount: 20 });
    const groups = findOverbookings([ok, a, b], 120, 30, 10);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.map((r) => r.id).sort()).toEqual(["a", "b"]);
  });
});

describe("suggestTable", () => {
  it("sugere a mesa livre mais pequena que caiba no grupo", () => {
    const target = makeResv({ id: "target", time: "19:00", peopleCount: 3 });
    const tables = [
      { id: "small", seats: 2 },
      { id: "fit", seats: 4 },
      { id: "big", seats: 8 },
    ];
    expect(suggestTable(target, [target], tables, 120)).toBe("fit");
  });

  it("ignora mesas já ocupadas na mesma janela", () => {
    const target = makeResv({ id: "target", time: "19:00", peopleCount: 2 });
    const busy = makeResv({ id: "busy", time: "19:30", peopleCount: 2, tableId: "fit" });
    const tables = [
      { id: "fit", seats: 4 },
      { id: "other", seats: 4 },
    ];
    expect(suggestTable(target, [target, busy], tables, 120)).toBe("other");
  });
});
