import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { getMenuItem } from "@/data/helpers";
import type { SelectedIngredient } from "@/data/types";

export type CartLine = {
  key: string;
  menuItemId: string;
  restaurantId: string;
  qty: number;
  selectedIngredients: SelectedIngredient[];
};

type CartValue = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  add: (menuItemId: string, qty: number, selectedIngredients: SelectedIngredient[]) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartValue | null>(null);

const DELIVERY_FEE = 700;

/** Preço unitário de uma linha: preço base do prato + extras selecionados com custo. */
export function lineUnitPrice(line: CartLine): number {
  const menuItem = getMenuItem(line.menuItemId);
  if (!menuItem) return 0;
  const extras = line.selectedIngredients
    .filter((s) => s.included)
    .reduce((sum, s) => {
      const def = menuItem.ingredients.find((i) => i.id === s.id);
      return sum + (def?.extraPrice ?? 0);
    }, 0);
  return menuItem.price + extras;
}

function makeLineKey(menuItemId: string, selectedIngredients: SelectedIngredient[]) {
  const extras = selectedIngredients
    .filter((s) => s.included)
    .map((s) => s.id)
    .sort()
    .join(",");
  return `${menuItemId}|${extras}`;
}

function seedLines(): CartLine[] {
  return ["menu-601", "menu-shared-agua-601"]
    .map((id) => getMenuItem(id))
    .filter((m): m is NonNullable<typeof m> => Boolean(m))
    .map((m) => ({
      key: makeLineKey(m.id, []),
      menuItemId: m.id,
      restaurantId: m.restaurantId,
      qty: 1,
      selectedIngredients: [],
    }));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(seedLines);

  const value = useMemo<CartValue>(() => {
    const subtotal = lines.reduce((sum, line) => sum + lineUnitPrice(line) * line.qty, 0);
    const deliveryFee = lines.length ? DELIVERY_FEE : 0;

    return {
      lines,
      count: lines.reduce((s, l) => s + l.qty, 0),
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
      add: (menuItemId, qty, selectedIngredients) =>
        setLines((prev) => {
          const menuItem = getMenuItem(menuItemId);
          if (!menuItem) return prev;
          const key = makeLineKey(menuItemId, selectedIngredients);
          const existing = prev.find((l) => l.key === key);
          if (existing) {
            return prev.map((l) => (l.key === key ? { ...l, qty: l.qty + qty } : l));
          }
          return [
            ...prev,
            { key, menuItemId, restaurantId: menuItem.restaurantId, qty, selectedIngredients },
          ];
        }),
      setQty: (key, qty) =>
        setLines((prev) =>
          qty <= 0
            ? prev.filter((l) => l.key !== key)
            : prev.map((l) => (l.key === key ? { ...l, qty } : l)),
        ),
      remove: (key) => setLines((prev) => prev.filter((l) => l.key !== key)),
      clear: () => setLines([]),
    };
  }, [lines]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
