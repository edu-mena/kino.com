import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  createApiMenuItem,
  deleteApiMenuItem,
  setApiMenuItemAvailability,
  updateApiMenuItem,
} from "@/data/api-menu-items";
import { fetchApiMenuItems } from "@/data/api-restaurants";
import {
  createMenuItem,
  deleteMenuItem,
  getEffectiveMenuItems,
  toggleMenuItemAvailability,
  updateMenuItem,
  type MenuItemInput,
} from "@/data/menu-store";
import { INITIAL_MENU_ITEMS } from "@/data/mockData";
import type { MenuItem } from "@/data/types";
import { hasRealBackend } from "@/lib/api-client";
import { getAdminToken, useManagedRestaurantId } from "@/lib/restaurant-admin";

/**
 * CRUD de pratos + disponibilidade, gerido pelo painel do restaurante
 * (`/admin/cardapio`). Com backend real (`hasRealBackend`), fala com a API
 * (ver @/data/api-menu-items) escopada ao restaurante do painel
 * (`useManagedRestaurantId()` — este provider vive no `__root`, ANCESTRAL
 * de `RestaurantAdminProvider`/`OperatorProviders`, nunca consegue ler o
 * contexto deles; ver o comentário de `useManagedRestaurantId` em
 * `@/lib/restaurant-admin`) — sem backend, a leitura/escrita de sempre
 * vive em `@/data/menu-store` (síncrona, localStorage). `items`/
 * `isAvailable` também são lidos por páginas de cliente (dish-card.tsx,
 * prato.$dishId.tsx) fora do painel — aí `managedRestaurantId` é `null`,
 * então `items` fica vazio e `isAvailable` cai no fallback `true` (a
 * verificação real de disponibilidade nesses casos já vem do próprio
 * `item.isAvailable` da API).
 */
type MenuAdminValue = {
  /** Todos os pratos do restaurante do painel, já com criações/edições/
   * eliminações aplicadas. */
  items: MenuItem[];
  isAvailable: (menuItemId: string) => boolean;
  toggleAvailability: (menuItemId: string) => void;
  /** `ok: false` = a escrita falhou (ex: quota do localStorage excedida em
   * mock, ou erro de rede/validação com backend real) — o prato pode não
   * ter sido guardado. */
  createItem: (
    restaurantId: string,
    input: MenuItemInput,
  ) => Promise<{ item: MenuItem; ok: boolean }>;
  updateItem: (id: string, input: MenuItemInput) => Promise<boolean>;
  deleteItem: (id: string) => Promise<void>;
};

const MenuAdminContext = createContext<MenuAdminValue | null>(null);

export function MenuAdminProvider({ children }: { children: ReactNode }) {
  // `null` em páginas de cliente (fora do painel) — ver `useManagedRestaurantId`.
  const managedRestaurantId = useManagedRestaurantId();
  // SSR-safe: a primeira renderização (servidor, e a do cliente antes da
  // hidratação) usa sempre o seed estático puro, sem tocar em localStorage
  // — evita mismatch de hidratação. O `useEffect` abaixo, que só corre no
  // cliente, é que lê o estado real guardado e ressincroniza.
  const [items, setItems] = useState<MenuItem[]>(hasRealBackend ? [] : INITIAL_MENU_ITEMS);

  const refetchApi = () => {
    if (!managedRestaurantId) {
      setItems([]);
      return;
    }
    fetchApiMenuItems(managedRestaurantId)
      .then(setItems)
      .catch(() => setItems([]));
  };

  useEffect(() => {
    if (hasRealBackend) {
      refetchApi();
      return;
    }
    // `activeMenusOnly: false` — o painel precisa de ver (e poder editar)
    // pratos de cardápios ainda em rascunho/desativados, não só os
    // visíveis ao cliente.
    const sync = () => setItems(getEffectiveMenuItems({ activeMenusOnly: false }));
    sync();
    window.addEventListener("luku:menu-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("luku:menu-changed", sync);
      window.removeEventListener("storage", sync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [managedRestaurantId]);

  const value: MenuAdminValue = hasRealBackend
    ? {
        items,
        isAvailable: (menuItemId) => items.find((i) => i.id === menuItemId)?.isAvailable ?? true,
        toggleAvailability: (menuItemId) => {
          const token = getAdminToken();
          const item = items.find((i) => i.id === menuItemId);
          if (!token || !item) return;
          void setApiMenuItemAvailability(
            menuItemId,
            item.restaurantId,
            !item.isAvailable,
            token,
          ).then(refetchApi);
        },
        createItem: async (restaurantId, input) => {
          const token = getAdminToken();
          if (!token)
            return { item: { ...input, id: "", restaurantId, isAvailable: true }, ok: false };
          try {
            const item = await createApiMenuItem(restaurantId, input, token);
            refetchApi();
            return { item, ok: true };
          } catch {
            return { item: { ...input, id: "", restaurantId, isAvailable: true }, ok: false };
          }
        },
        updateItem: async (id, input) => {
          const token = getAdminToken();
          if (!token) return false;
          try {
            await updateApiMenuItem(id, input, token);
            refetchApi();
            return true;
          } catch {
            return false;
          }
        },
        deleteItem: async (id) => {
          const token = getAdminToken();
          if (!token) return;
          await deleteApiMenuItem(id, token);
          refetchApi();
        },
      }
    : {
        items,
        isAvailable: (menuItemId) => items.find((i) => i.id === menuItemId)?.isAvailable ?? true,
        toggleAvailability: (menuItemId) => toggleMenuItemAvailability(menuItemId),
        createItem: (restaurantId, input) => Promise.resolve(createMenuItem(restaurantId, input)),
        updateItem: (id, input) => Promise.resolve(updateMenuItem(id, input)),
        deleteItem: (id) => {
          deleteMenuItem(id);
          return Promise.resolve();
        },
      };

  return <MenuAdminContext.Provider value={value}>{children}</MenuAdminContext.Provider>;
}

export function useMenuAdmin() {
  const ctx = useContext(MenuAdminContext);
  if (!ctx) throw new Error("useMenuAdmin must be used inside MenuAdminProvider");
  return ctx;
}
