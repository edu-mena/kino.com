/** Filtro simplificado das listas do cliente — ver `ClientListFilters`. */
export type DateRange = { from?: Date | undefined; to?: Date | undefined };

export type ClientListFilter = {
  /** `null` = todos os restaurantes. */
  restaurantId: string | null;
  range: DateRange | undefined;
};

export const EMPTY_CLIENT_LIST_FILTER: ClientListFilter = { restaurantId: null, range: undefined };

export const isClientListFilterActive = (f: ClientListFilter) =>
  f.restaurantId !== null || !!f.range?.from;

/** `true` se o item passa no filtro. `date` é a data que a lista mostra/agrupa. */
export function matchesClientListFilter(
  f: ClientListFilter,
  restaurantId: string,
  date: Date,
): boolean {
  if (f.restaurantId !== null && restaurantId !== f.restaurantId) return false;
  const from = f.range?.from;
  if (!from) return true;
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  // Só "de" escolhido (clique único no calendário) = esse dia inteiro.
  const end = new Date(f.range?.to ?? from);
  end.setHours(23, 59, 59, 999);
  return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
}

/** "YYYY-MM-DD" → meia-noite LOCAL desse dia (`new Date("YYYY-MM-DD")` seria UTC). */
export function localDay(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}
