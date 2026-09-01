import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  createMenu,
  deleteMenu,
  getEffectiveMenus,
  renameMenu,
  toggleMenuActive,
} from "@/data/menus-store";
import { createMenuItem, menuHasDishes, normalizeIngredients } from "@/data/menu-store";
import { getMenuCategoryTemplate } from "@/data/menu-templates";
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
  createMenu: (restaurantId: string, name: string, category?: string) => RestaurantMenu;
  /** Cria um cardápio de uma categoria e, se `withDishes`, semeia-o com os
   * pratos-modelo dessa categoria (ver `@/data/menu-templates`). Devolve o
   * cardápio e quantos pratos foram criados. */
  createMenuFromCategory: (
    restaurantId: string,
    categoryKey: string,
    withDishes: boolean,
    name?: string,
  ) => { menu: RestaurantMenu; dishCount: number };
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
    createMenu: (restaurantId, name, category) => createMenu(restaurantId, name, category),
    createMenuFromCategory: (restaurantId, categoryKey, withDishes, name) => {
      const template = getMenuCategoryTemplate(categoryKey);
      const menu = createMenu(restaurantId, name ?? template?.defaultName ?? "", categoryKey);
      let dishCount = 0;
      if (withDishes && template) {
        for (const dish of template.dishes) {
          const { ok } = createMenuItem(restaurantId, {
            menuId: menu.id,
            name: dish.name,
            description: dish.description,
            price: dish.price,
            category: dish.category,
            image: dish.image,
            portionInfo: dish.portionInfo,
            prepTimeMinutes: dish.prepTimeMinutes,
            ingredients: normalizeIngredients(dish.ingredients),
          });
          if (ok) dishCount += 1;
        }
      }
      return { menu, dishCount };
    },
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
