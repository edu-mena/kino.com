import type { MenuItem } from "@/data/types";

export type DishGroup = { name: string; items: MenuItem[] };

/** Agrupa itens de cardápio pelo nome exato do prato, preservando a ordem
 * da primeira ocorrência — usado nos RESULTADOS DE PESQUISA (busca global
 * e pesquisa em `/cardapio`), pra mostrar 1 resultado por prato em vez de
 * 1 por restaurante que o oferece. A navegação normal do cardápio (sem
 * pesquisa activa) continua a mostrar cada prato-restaurante à parte —
 * ver `MenuBrowser`. */
export function groupMenuItemsByName(items: MenuItem[]): DishGroup[] {
  const order: string[] = [];
  const byName = new Map<string, MenuItem[]>();
  for (const item of items) {
    if (!byName.has(item.name)) {
      byName.set(item.name, []);
      order.push(item.name);
    }
    byName.get(item.name)!.push(item);
  }
  return order.map((name) => ({ name, items: byName.get(name)! }));
}
