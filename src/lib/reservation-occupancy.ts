import type { Reservation } from "@/data/types";

/**
 * Matemática de ocupação de sala das reservas — pura e testável, extraída de
 * `/admin/reservas`. "Ocupam a sala" as reservas Pendente/Confirmada; duas
 * reservas na mesma data cujas janelas de `slotMin` se sobrepõem estão na
 * mesma janela. Uma janela é sobre-reserva quando a procura excede a
 * capacidade OU há mesas repetidas.
 */
export const DEFAULT_SLOT_MIN = 120;
const OCCUPYING = new Set(["Pendente", "Confirmada"]);

export const timeToMin = (t: string) => {
  const [h = 0, m = 0] = t.split(":").map(Number);
  return h * 60 + m;
};

export const isOccupying = (status: string) => OCCUPYING.has(status);

export function overlaps(a: Reservation, b: Reservation, slotMin: number): boolean {
  return a.date === b.date && Math.abs(timeToMin(a.time) - timeToMin(b.time)) < slotMin;
}

export type OccupancyInfo = {
  parties: number;
  seats: number;
  seatsOver: boolean;
  partiesOver: boolean;
  tableClash: boolean;
  overbooked: boolean;
};

/** Ocupação da janela de `r` (inclui `r`). `future` já deve estar filtrado
 * para reservas que ocupam a sala e com data >= hoje. */
export function windowOccupancy(
  r: Reservation,
  future: Reservation[],
  slotMin: number,
  totalSeats: number,
  tableCount: number,
): OccupancyInfo {
  const inWindow = future.filter((x) => x.id === r.id || overlaps(r, x, slotMin));
  const seats = inWindow.reduce((s, x) => s + x.peopleCount, 0);
  const used = inWindow.map((x) => x.tableId).filter(Boolean) as string[];
  const seatsOver = totalSeats > 0 && seats > totalSeats;
  const partiesOver = tableCount > 0 && inWindow.length > tableCount;
  const tableClash = new Set(used).size !== used.length;
  return {
    parties: inWindow.length,
    seats,
    seatsOver,
    partiesOver,
    tableClash,
    overbooked: seatsOver || partiesOver || tableClash,
  };
}

/** Grupos de reservas (componentes conexos por sobreposição) cuja janela
 * está sobre-reservada. `relevant` = reservas que ocupam a sala, data >= hoje. */
export function findOverbookings(
  relevant: Reservation[],
  slotMin: number,
  totalSeats: number,
  tableCount: number,
): Reservation[][] {
  const seen = new Set<string>();
  const groups: Reservation[][] = [];
  for (const start of relevant) {
    if (seen.has(start.id)) continue;
    const group: Reservation[] = [];
    const stack = [start];
    while (stack.length) {
      const cur = stack.pop()!;
      if (seen.has(cur.id)) continue;
      seen.add(cur.id);
      group.push(cur);
      for (const other of relevant) {
        if (!seen.has(other.id) && overlaps(cur, other, slotMin)) stack.push(other);
      }
    }
    const seats = group.reduce((s, x) => s + x.peopleCount, 0);
    const used = group.map((x) => x.tableId).filter(Boolean) as string[];
    const tableClash = new Set(used).size !== used.length;
    const overCapacity =
      (totalSeats > 0 && seats > totalSeats) || (tableCount > 0 && group.length > tableCount);
    if (tableClash || overCapacity) {
      group.sort((a, b) => a.time.localeCompare(b.time));
      groups.push(group);
    }
  }
  groups.sort(
    (a, b) =>
      new Date(`${a[0]!.date}T${a[0]!.time}`).getTime() -
      new Date(`${b[0]!.date}T${b[0]!.time}`).getTime(),
  );
  return groups;
}

/** Mapa `id -> ids em conflito` a partir dos grupos de sobre-reserva. */
export function conflictMap(groups: Reservation[][]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const g of groups) {
    for (const r of g)
      map.set(
        r.id,
        g.filter((x) => x.id !== r.id).map((x) => x.id),
      );
  }
  return map;
}

/** Mesa livre mais pequena que caiba em `r.peopleCount` na janela de `r`. */
export function suggestTable(
  r: Reservation,
  future: Reservation[],
  tables: { id: string; seats: number }[],
  slotMin: number,
): string {
  const taken = new Set(
    future
      .filter((x) => x.id !== r.id && x.tableId && overlaps(r, x, slotMin))
      .map((x) => x.tableId),
  );
  return (
    tables
      .filter((tbl) => !taken.has(tbl.id) && tbl.seats >= r.peopleCount)
      .sort((a, b) => a.seats - b.seats)[0]?.id ?? ""
  );
}
