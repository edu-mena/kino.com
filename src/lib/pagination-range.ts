/** Lacuna (`…`) entre números de página — páginas escondidas. */
export const PAGE_GAP = "gap" as const;

export type PageSlot = number | typeof PAGE_GAP;

/** Largura de cada botão (`h-9 w-9`) + o `gap-2` entre eles, em px. */
const SLOT_PX = 36;
const GAP_PX = 8;
/** Com folga no ecrã, até 9 números (2 vizinhos de cada lado da atual). */
const MAX_SLOTS = 9;

/** Quantos números de página cabem numa linha de `widthPx`, já descontadas
 * as duas setas (anterior/seguinte), que estão sempre lá. */
export function pageSlotsForWidth(widthPx: number): number {
  const fit = Math.floor((widthPx + GAP_PX) / (SLOT_PX + GAP_PX)) - 2;
  return Math.max(1, Math.min(MAX_SLOTS, fit));
}

/**
 * Números de página a mostrar sem nunca passar de `maxSlots` posições
 * (lacunas incluídas): primeira e última sempre visíveis, uma janela à volta
 * da atual, `…` no que fica de fora — os botões mantêm o tamanho em vez de
 * encolherem para caberem todos. Uma lacuna esconde sempre 2+ páginas
 * (esconder só uma não poupava espaço nenhum). Abaixo de 5 posições já não
 * cabe "1 … n … última" — fica só a atual, as setas fazem o resto.
 */
export function paginationRange(page: number, totalPages: number, maxSlots: number): PageSlot[] {
  const all = Array.from({ length: totalPages }, (_, i) => i + 1);
  if (totalPages <= maxSlots) return all;
  if (maxSlots < 5) return [page];

  // Posições do meio: tirando primeira, última e as duas lacunas.
  const middle = maxSlots - 4;
  const start = page - Math.floor((middle - 1) / 2);
  const end = start + middle - 1;

  if (start <= 3) {
    return [...all.slice(0, maxSlots - 2), PAGE_GAP, totalPages];
  }
  if (end >= totalPages - 2) {
    return [1, PAGE_GAP, ...all.slice(totalPages - (maxSlots - 2))];
  }
  return [1, PAGE_GAP, ...all.slice(start - 1, end), PAGE_GAP, totalPages];
}
