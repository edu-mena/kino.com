import { useEffect, useState } from "react";
import { fetchApiAllMenuItems, fetchApiMenuItems } from "./api-restaurants";
import { getEffectiveMenuItems } from "./menu-store";
import { INITIAL_MENU_ITEMS } from "./mockData";
import type { MenuItem } from "./types";
import { hasRealBackend } from "@/lib/api-client";

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
 *
 * `restaurantId` (opcional): com backend real, restringe a busca ao
 * cardápio DESSE restaurante via API (rápido, um pedido só) — usado por
 * `MenuBrowser` quando `lockedRestaurantId` está definido (a página de
 * cardápio de um restaurante, `/menu/$restaurantId`, e o cardápio dentro do
 * detalhe do restaurante). Sem `restaurantId` (busca global,
 * `/cardapio`) ou sem backend real (demo), comportamento inalterado.
 *
 * `loading`: com backend real, `items` começa vazio até o pedido resolver
 * (SSR nunca corre o `useEffect`, por isso a 1ª renderização — incl. o HTML
 * que o servidor manda) fica sempre sem pratos nenhum). Sem `loading`
 * distinto de "está mesmo vazio", `MenuBrowser` mostrava "nenhum resultado"
 * nesse instante mesmo num restaurante cheio de pratos — bug real,
 * encontrado a testar /restaurantes/$id logo depois de cadastrar um prato
 * (a corrida entre o primeiro paint e o fetch resolver às vezes perdia).
 */
export function useMenuItems(restaurantId?: string): { items: MenuItem[]; loading: boolean } {
  const [items, setItems] = useState<MenuItem[]>(hasRealBackend ? [] : INITIAL_MENU_ITEMS);
  const [loading, setLoading] = useState(hasRealBackend);

  useEffect(() => {
    if (hasRealBackend) {
      setLoading(true);
      const fetcher = restaurantId ? fetchApiMenuItems(restaurantId) : fetchApiAllMenuItems();
      fetcher
        .then(setItems)
        .catch(() => setItems([]))
        .finally(() => setLoading(false));
      return;
    }

    const sync = () => setItems(getEffectiveMenuItems());
    sync();
    window.addEventListener("luku:menu-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("luku:menu-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, [restaurantId]);

  return { items, loading };
}
