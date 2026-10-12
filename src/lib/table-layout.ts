import type { RestaurantTable, TableCombination } from "@/data/tables-store";
import { compareTables } from "@/data/tables-store";

/**
 * Sala de um dia: mesas em serviço + junções desse dia → "unidades" onde se
 * senta um grupo. Uma junção (ex.: Mesa 3 + Mesa 4) é UMA unidade com a
 * capacidade que o staff lhe deu; uma reserva gravada em qualquer mesa da
 * junção (normalmente a âncora, a 1.ª) ocupa a junção inteira nesse dia.
 * Puro e testável — usado pela "Sala do dia" (`/admin/mesas`), pela planta
 * e pelos conflitos de `/admin/reservas`. Espelho de
 * `ReservationOccupancyService::unitMap` no backend.
 */

export type FloorUnit = {
  /** `t:<tableId>` ou `c:<combinationId>`. */
  key: string;
  kind: "table" | "combo";
  /** Onde fica gravada uma reserva atribuída a esta unidade. */
  anchorTableId: string;
  tableIds: string[];
  tables: RestaurantTable[];
  name: string;
  seats: number;
  area?: string;
  combinationId?: string;
};

/** YYYY-MM-DD na hora LOCAL do dispositivo (`toISOString` dá a data UTC,
 * que em Angola troca de dia uma hora antes da meia-noite local). */
export function localIsoDate(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return localIsoDate(d);
}

export const isTableActive = (t: RestaurantTable) => t.isActive !== false;
export const isTableCombinable = (t: RestaurantTable) => t.isCombinable !== false;

/** "Mesa 3 + Mesa 4" (ou o rótulo dado pelo staff). */
export function combinationName(
  combo: Pick<TableCombination, "label" | "tableIds">,
  tablesById: Map<string, RestaurantTable>,
): string {
  if (combo.label?.trim()) return combo.label.trim();
  return combo.tableIds
    .map((id) => tablesById.get(id)?.name)
    .filter(Boolean)
    .join(" + ");
}

/** Junções válidas num dia: todas as mesas existem e estão em serviço, e
 * sobram pelo menos duas (uma "junção" de uma mesa não é junção). */
export function combinationsOn(
  combos: TableCombination[],
  date: string,
  tablesById: Map<string, RestaurantTable>,
): TableCombination[] {
  return combos
    .filter((c) => c.date === date)
    .map((c) => ({
      ...c,
      tableIds: c.tableIds.filter((id) => {
        const t = tablesById.get(id);
        return t !== undefined && isTableActive(t);
      }),
    }))
    .filter((c) => c.tableIds.length >= 2);
}

export function buildDayUnits(
  tables: RestaurantTable[],
  combos: TableCombination[],
  date: string,
): FloorUnit[] {
  const active = tables.filter(isTableActive).sort(compareTables);
  const byId = new Map(active.map((t) => [t.id, t]));
  const dayCombos = combinationsOn(combos, date, byId);
  const comboOf = new Map<string, TableCombination>();
  for (const c of dayCombos) for (const id of c.tableIds) comboOf.set(id, c);

  const units: FloorUnit[] = [];
  const emitted = new Set<string>();
  // Pela ordem da sala: a junção aparece onde aparece a sua 1.ª mesa.
  for (const t of active) {
    const combo = comboOf.get(t.id);
    if (!combo) {
      units.push({
        key: `t:${t.id}`,
        kind: "table",
        anchorTableId: t.id,
        tableIds: [t.id],
        tables: [t],
        name: t.name,
        seats: t.seats,
        ...(t.area ? { area: t.area } : {}),
      });
      continue;
    }
    if (emitted.has(combo.id)) continue;
    emitted.add(combo.id);
    const members = combo.tableIds.map((id) => byId.get(id)!);
    const anchor = members[0]!;
    units.push({
      key: `c:${combo.id}`,
      kind: "combo",
      anchorTableId: anchor.id,
      tableIds: combo.tableIds,
      tables: members,
      name: combinationName(combo, byId),
      seats: combo.seats,
      ...(anchor.area ? { area: anchor.area } : {}),
      combinationId: combo.id,
    });
  }
  return units;
}

/** Chave da unidade que a mesa `tableId` forma no dia `date`. */
export function unitKeyFor(tableId: string, date: string, combos: TableCombination[]): string {
  const combo = combos.find((c) => c.date === date && c.tableIds.includes(tableId));
  return combo ? `c:${combo.id}` : `t:${tableId}`;
}

/** Unidade (do dia) onde está uma reserva — `undefined` sem mesa ou se a
 * mesa já não está em serviço. */
export function unitOfTable(
  units: FloorUnit[],
  tableId: string | undefined,
): FloorUnit | undefined {
  if (!tableId) return undefined;
  return units.find((u) => u.tableIds.includes(tableId));
}

export type DayCapacity = {
  /** Sítios onde se senta um grupo (junção conta 1). */
  units: number;
  /** Mesas físicas em serviço. */
  tables: number;
  seats: number;
  combinations: number;
};

export function dayCapacity(units: FloorUnit[]): DayCapacity {
  return {
    units: units.length,
    tables: units.reduce((n, u) => n + u.tableIds.length, 0),
    seats: units.reduce((n, u) => n + u.seats, 0),
    combinations: units.filter((u) => u.kind === "combo").length,
  };
}

/**
 * Mesas a juntar para um grupo de `pax` que não cabe em nenhuma unidade
 * livre: dentro da mesma zona (juntar mesas de salas diferentes não faz
 * sentido), as maiores primeiro até chegar à lotação. Fica a zona que
 * precisa de menos mesas e desperdiça menos lugares. `null` se nem assim.
 */
export function suggestCombination(
  pax: number,
  freeTables: RestaurantTable[],
): RestaurantTable[] | null {
  const byArea = new Map<string, RestaurantTable[]>();
  for (const t of freeTables) {
    if (!isTableActive(t) || !isTableCombinable(t)) continue;
    const area = t.area?.trim().toLowerCase() ?? "";
    byArea.set(area, [...(byArea.get(area) ?? []), t]);
  }
  let best: RestaurantTable[] | null = null;
  for (const list of byArea.values()) {
    const sorted = [...list].sort((a, b) => b.seats - a.seats || compareTables(a, b));
    const pick: RestaurantTable[] = [];
    let seats = 0;
    for (const t of sorted) {
      if (seats >= pax) break;
      pick.push(t);
      seats += t.seats;
    }
    if (seats < pax || pick.length < 2) continue;
    // Troca a última (maior que o necessário) pela mais pequena que ainda
    // chegue — menos lugares vazios.
    const before = seats - pick[pick.length - 1]!.seats;
    const smaller = sorted
      .filter((t) => !pick.includes(t) && before + t.seats >= pax)
      .sort((a, b) => a.seats - b.seats)[0];
    if (smaller && smaller.seats < pick[pick.length - 1]!.seats) {
      pick[pick.length - 1] = smaller;
    }
    pick.sort(compareTables);
    const waste = (p: RestaurantTable[]) => p.reduce((n, t) => n + t.seats, 0) - pax;
    if (
      !best ||
      pick.length < best.length ||
      (pick.length === best.length && waste(pick) < waste(best))
    ) {
      best = pick;
    }
  }
  return best;
}
