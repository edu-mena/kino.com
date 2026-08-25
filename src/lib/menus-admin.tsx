import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  createMenu,
  deleteMenu,
  getEffectiveMenus,
  renameMenu,
  toggleMenuActive,
} from "@/data/menus-store";
import { menuHasDishes } from "@/data/menu-store";
import { INITIAL_RESTAURANTS } from "@/data/mockData";
import type { RestaurantMenu } from "@/data/types";

/** Um "Cardápio Principal" sintético por restaurante, antes de qualquer
 * leitura de localStorage — igual à lista efetiva sem overrides/eliminações,
 * suficiente para a primeira renderização (SSR-safe) bater certo com o que
 * `@/data/menus-store` produz do lado do servidor. */
function initialMenus(): RestaurantMenu[] {
  return INITIAL_RESTAURANTS.map((r) => ({
    id: `menu-default-${r.id}`,
    restaurantId: r.id,
    name: "Cardápio Principal",
    isActive: true,
  }));
}

type MenusAdminValue = {
  menus: RestaurantMenu[];
  menusByRestaurant: (restaurantId: string) => RestaurantMenu[];
  createMenu: (restaurantId: string, name: string) => RestaurantMenu;
  renameMenu: (id: string, name: string) => void;
  toggleMenuActive: (id: string) => void;
  /** `false` se recusado (é o último cardápio do restaurante, ou ainda tem
   * pratos — a UI deve verificar `menuHasDishes` antes de convidar a apagar). */
  deleteMenu: (id: string) => boolean;
  menuHasDishes: (id: string) => boolean;
};

const MenusAdminContext = createContext<MenusAdminValue | null>(null);

export function MenusAdminProvider({ children }: { children: ReactNode }) {
  const [menus, setMenus] = useState<RestaurantMenu[]>(initialMenus);

  useEffect(() => {
    const sync = () => setMenus(getEffectiveMenus());
    sync();
    window.addEventListener("kino:menu-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("kino:menu-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const value: MenusAdminValue = {
    menus,
    menusByRestaurant: (restaurantId) => menus.filter((m) => m.restaurantId === restaurantId),
    createMenu: (restaurantId, name) => createMenu(restaurantId, name),
    renameMenu: (id, name) => renameMenu(id, name),
    toggleMenuActive: (id) => toggleMenuActive(id),
    deleteMenu: (id) => deleteMenu(id),
    menuHasDishes: (id) => menuHasDishes(id),
  };

  return <MenusAdminContext.Provider value={value}>{children}</MenusAdminContext.Provider>;
}

export function useMenusAdmin() {
  const ctx = useContext(MenusAdminContext);
  if (!ctx) throw new Error("useMenusAdmin must be used inside MenusAdminProvider");
  return ctx;
}
