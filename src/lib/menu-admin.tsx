import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
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

/**
 * CRUD de pratos + disponibilidade, gerido pelo painel do restaurante
 * (`/admin/cardapio`). A leitura/escrita de verdade vive em
 * `@/data/menu-store` (síncrona, sem React, segura em SSR) — este ficheiro
 * é só a camada reativa: guarda `items` em estado e ressincroniza sempre
 * que algo muda (`kino:menu-changed`, disparado pelo próprio store) ou
 * quando outra aba altera o localStorage (`storage`).
 */
type MenuAdminValue = {
  /** Todos os pratos, já com criações/edições/eliminações do painel
   * aplicadas — a mesma lista que `@/data/helpers` usa por baixo dos panos. */
  items: MenuItem[];
  isAvailable: (menuItemId: string) => boolean;
  toggleAvailability: (menuItemId: string) => void;
  /** `ok: false` = a escrita falhou (ex: quota do localStorage excedida,
   * comum com imagens grandes) — o prato pode não ter sido guardado. */
  createItem: (restaurantId: string, input: MenuItemInput) => { item: MenuItem; ok: boolean };
  updateItem: (id: string, input: MenuItemInput) => boolean;
  deleteItem: (id: string) => void;
};

const MenuAdminContext = createContext<MenuAdminValue | null>(null);

export function MenuAdminProvider({ children }: { children: ReactNode }) {
  // SSR-safe: a primeira renderização (servidor, e a do cliente antes da
  // hidratação) usa sempre o seed estático puro, sem tocar em localStorage
  // — evita mismatch de hidratação. O `useEffect` abaixo, que só corre no
  // cliente, é que lê o estado real guardado e ressincroniza.
  const [items, setItems] = useState<MenuItem[]>(INITIAL_MENU_ITEMS);

  useEffect(() => {
    // `activeMenusOnly: false` — o painel precisa de ver (e poder editar)
    // pratos de cardápios ainda em rascunho/desativados, não só os
    // visíveis ao cliente.
    const sync = () => setItems(getEffectiveMenuItems({ activeMenusOnly: false }));
    sync();
    window.addEventListener("kino:menu-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("kino:menu-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const value: MenuAdminValue = {
    items,
    isAvailable: (menuItemId) => items.find((i) => i.id === menuItemId)?.isAvailable ?? true,
    toggleAvailability: (menuItemId) => toggleMenuItemAvailability(menuItemId),
    createItem: (restaurantId, input) => createMenuItem(restaurantId, input),
    updateItem: (id, input) => updateMenuItem(id, input),
    deleteItem: (id) => deleteMenuItem(id),
  };

  return <MenuAdminContext.Provider value={value}>{children}</MenuAdminContext.Provider>;
}

export function useMenuAdmin() {
  const ctx = useContext(MenuAdminContext);
  if (!ctx) throw new Error("useMenuAdmin must be used inside MenuAdminProvider");
  return ctx;
}
