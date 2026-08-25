import { useEffect, useState } from "react";
import { getEffectiveMenuItems } from "./menu-store";
import { INITIAL_MENU_ITEMS } from "./mockData";
import type { MenuItem } from "./types";

/**
 * Todos os pratos visíveis a clientes (só de cardápios ativos), reativo a
 * criações/edições/eliminações feitas no painel do restaurante — mesmo
 * padrão SSR-safe do resto da app: a primeira renderização usa sempre o
 * seed estático puro (evita mismatch de hidratação), sincronizando com o
 * estado real só depois, no `useEffect` (cliente apenas).
 *
 * Componentes que hoje importam `INITIAL_MENU_ITEMS` diretamente de
 * `@/data/mockData` para montar listas/filtros devem usar isto — é o que
 * faz um prato criado/editado/apagado no painel aparecer (ou desaparecer)
 * de verdade na busca, no cardápio e na home.
 */
export function useMenuItems(): MenuItem[] {
  const [items, setItems] = useState<MenuItem[]>(INITIAL_MENU_ITEMS);

  useEffect(() => {
    const sync = () => setItems(getEffectiveMenuItems());
    sync();
    window.addEventListener("kino:menu-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("kino:menu-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return items;
}
