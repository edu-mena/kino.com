import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { getDish, type AddOn } from "./mock-data";

export type CartLine = {
  key: string;
  dishId: string;
  qty: number;
  addOns: AddOn[];
};

type CartValue = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  add: (dishId: string, qty: number, addOns: AddOn[]) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartValue | null>(null);

const DELIVERY_FEE = 700;

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([
    { key: "combo-classico|", dishId: "combo-classico", qty: 1, addOns: [] },
    { key: "batata-frita|", dishId: "batata-frita", qty: 1, addOns: [] },
  ]);

  const value = useMemo<CartValue>(() => {
    const subtotal = lines.reduce((sum, line) => {
      const dish = getDish(line.dishId);
      if (!dish) return sum;
      const addOns = line.addOns.reduce((s, a) => s + a.price, 0);
      return sum + (dish.price + addOns) * line.qty;
    }, 0);
    const deliveryFee = lines.length ? DELIVERY_FEE : 0;

    return {
      lines,
      count: lines.reduce((s, l) => s + l.qty, 0),
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
      add: (dishId, qty, addOns) =>
        setLines((prev) => {
          const key = `${dishId}|${addOns.map((a) => a.id).sort().join(",")}`;
          const existing = prev.find((l) => l.key === key);
          if (existing) {
            return prev.map((l) => (l.key === key ? { ...l, qty: l.qty + qty } : l));
          }
          return [...prev, { key, dishId, qty, addOns }];
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