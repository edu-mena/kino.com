import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { getMenuItem, getRestaurant } from "@/data/helpers";

const STORAGE_KEY = "kino_active_bill";

export type BillLine = { key: string; menuItemId: string; qty: number };

type ActiveBill = {
  restaurantId: string | null;
  lines: BillLine[];
};

const EMPTY_BILL: ActiveBill = { restaurantId: null, lines: [] };

function lineTotal(line: BillLine): number {
  return (getMenuItem(line.menuItemId)?.price ?? 0) * line.qty;
}

type BillValue = ActiveBill & {
  addToBill: (restaurantId: string, menuItemId: string) => void;
  updateQty: (key: string, qty: number) => void;
  discard: () => void;
  subtotalFor: (restaurantId: string) => number;
};

const BillContext = createContext<BillValue | null>(null);

export function BillProvider({ children }: { children: ReactNode }) {
  const [bill, setBill] = useState<ActiveBill>(EMPTY_BILL);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      setBill(JSON.parse(stored));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const persist = (next: ActiveBill) => {
    setBill(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  // Só uma lista temporária de cada vez — começar a de um restaurante
  // diferente substitui a anterior (ver `useAddToBill`).
  const ensureRestaurant = (restaurantId: string): ActiveBill =>
    bill.restaurantId === restaurantId ? bill : { ...EMPTY_BILL, restaurantId };

  const value: BillValue = {
    ...bill,
    addToBill: (restaurantId, menuItemId) => {
      const current = ensureRestaurant(restaurantId);
      const existing = current.lines.find((l) => l.menuItemId === menuItemId);
      const lines = existing
        ? current.lines.map((l) => (l.menuItemId === menuItemId ? { ...l, qty: l.qty + 1 } : l))
        : [...current.lines, { key: `${menuItemId}-${Date.now()}`, menuItemId, qty: 1 }];
      persist({ ...current, lines });
    },
    updateQty: (key, qty) =>
      persist({
        ...bill,
        lines:
          qty <= 0
            ? bill.lines.filter((l) => l.key !== key)
            : bill.lines.map((l) => (l.key === key ? { ...l, qty } : l)),
      }),
    // Descarta a lista temporária inteira — ex: pedido de entrega já criado,
    // trocar de ideias, ou trocar de restaurante a meio da escolha.
    discard: () => persist(EMPTY_BILL),
    subtotalFor: (restaurantId) =>
      bill.restaurantId === restaurantId ? bill.lines.reduce((sum, l) => sum + lineTotal(l), 0) : 0,
  };

  return <BillContext.Provider value={value}>{children}</BillContext.Provider>;
}

export function useBill() {
  const ctx = useContext(BillContext);
  if (!ctx) throw new Error("useBill must be used inside BillProvider");
  return ctx;
}

/**
 * O botão "+" dos pratos usa isto em vez de `addToBill` diretamente — um
 * prato só pode entrar na lista temporária de UM restaurante de cada vez.
 * Trocar de restaurante a meio começa uma lista nova (ver `ensureRestaurant`
 * em `BillProvider`); aqui só avisamos o usuário de que isso aconteceu.
 */
export function useAddToBill() {
  const { restaurantId: currentRestaurantId, lines, addToBill } = useBill();
  return (restaurantId: string, menuItemId: string, itemName: string) => {
    if (currentRestaurantId && currentRestaurantId !== restaurantId && lines.length > 0) {
      const previousName = getRestaurant(currentRestaurantId)?.name ?? "outro restaurante";
      toast.info(
        `Lista de ${previousName} foi substituída — só pode montar o pedido de um restaurante de cada vez.`,
      );
    }
    addToBill(restaurantId, menuItemId);
    toast.success(`${itemName} adicionado ao pedido`);
  };
}
