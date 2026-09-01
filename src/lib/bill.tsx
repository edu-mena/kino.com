import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { getMenuItem, getRestaurant } from "@/data/helpers";
import type { SelectedIngredient } from "@/data/types";
import { useTranslation } from "@/i18n";

const STORAGE_KEY = "kino_active_bill";

export type BillLine = {
  key: string;
  menuItemId: string;
  qty: number;
  /** Ingredientes principais desmarcados + adicionais escolhidos na página
   * do prato. Sem isto a personalização nunca chegava ao pedido. */
  selectedIngredients: SelectedIngredient[];
};

type ActiveBill = {
  restaurantId: string | null;
  lines: BillLine[];
};

const EMPTY_BILL: ActiveBill = { restaurantId: null, lines: [] };

/** Preço unitário: base do prato + adicionais selecionados com custo. */
export function billLineUnitPrice(line: BillLine): number {
  const menuItem = getMenuItem(line.menuItemId);
  if (!menuItem) return 0;
  const extras = line.selectedIngredients
    .filter((s) => s.included)
    .reduce(
      (sum, s) => sum + (menuItem.ingredients.find((i) => i.id === s.id)?.extraPrice ?? 0),
      0,
    );
  return menuItem.price + extras;
}

function lineTotal(line: BillLine): number {
  return billLineUnitPrice(line) * line.qty;
}

/** Chave que distingue "burger sem cebola" de "burger" e de "burger + bacon". */
function makeBillKey(menuItemId: string, selectedIngredients: SelectedIngredient[]): string {
  const sig = selectedIngredients
    .map((s) => `${s.id}:${s.included ? 1 : 0}`)
    .sort()
    .join(",");
  return `${menuItemId}|${sig}`;
}

type BillValue = ActiveBill & {
  addToBill: (
    restaurantId: string,
    menuItemId: string,
    selectedIngredients?: SelectedIngredient[],
  ) => void;
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
      const parsed = JSON.parse(stored) as ActiveBill;
      // Snapshots antigos podiam não ter `selectedIngredients`.
      parsed.lines = parsed.lines.map((l) => ({
        ...l,
        selectedIngredients: l.selectedIngredients ?? [],
      }));
      setBill(parsed);
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
    addToBill: (restaurantId, menuItemId, selectedIngredients = []) => {
      const current = ensureRestaurant(restaurantId);
      const key = makeBillKey(menuItemId, selectedIngredients);
      const existing = current.lines.find((l) => l.key === key);
      const lines = existing
        ? current.lines.map((l) => (l.key === key ? { ...l, qty: l.qty + 1 } : l))
        : [...current.lines, { key, menuItemId, qty: 1, selectedIngredients }];
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
  const { t } = useTranslation();
  return (
    restaurantId: string,
    menuItemId: string,
    itemName: string,
    selectedIngredients?: SelectedIngredient[],
  ) => {
    if (currentRestaurantId && currentRestaurantId !== restaurantId && lines.length > 0) {
      const previousName = getRestaurant(currentRestaurantId)?.name ?? t("bill.otherRestaurant");
      toast.info(t("bill.listReplaced", { name: previousName }));
    }
    addToBill(restaurantId, menuItemId, selectedIngredients);
    toast.success(t("bill.addedToOrder", { name: itemName }));
  };
}
