import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { getMenuItem, getRestaurant } from "@/data/helpers";
import { INITIAL_SAVED_ADDRESSES } from "@/data/mockData";
import type { SavedAddress, SelectedIngredient } from "@/data/types";

export type CartLine = {
  key: string;
  menuItemId: string;
  qty: number;
  selectedIngredients: SelectedIngredient[];
};

/**
 * Um pedido de entrega inteiro — tudo o que foi enviado de uma vez via
 * "Solicitar delivery" (sempre de UM restaurante, como a lista temporária
 * que lhe deu origem). Conta como UM delivery só, mesmo com vários pratos
 * lá dentro; a página de entrega lista estes pedidos, cada um com o seu
 * próprio estado — não é um carrinho editável de itens soltos.
 */
export type CartOrder = {
  id: string;
  restaurantId: string;
  lines: CartLine[];
  createdAt: string;
  deliveryAddress: SavedAddress;
  status: string;
  /** Estimativa (minutos) capturada do restaurante no momento do pedido. */
  estimatedMinutes: number;
  /** Preferência de pagamento enviada ao restaurante — só existe depois de
   * passar pelo checkout (`confirmOrder`). A Kino não processa o pagamento
   * em si, isto é só a preferência relayed ao restaurante. */
  paymentMethod?: string;
};

type NewCartLine = {
  menuItemId: string;
  qty: number;
  selectedIngredients?: SelectedIngredient[];
};

type CartValue = {
  orders: CartOrder[];
  count: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  orderSubtotal: (order: CartOrder) => number;
  orderTotal: (order: CartOrder) => number;
  addOrder: (restaurantId: string, items: NewCartLine[], deliveryAddress: SavedAddress) => void;
  setQty: (orderId: string, lineKey: string, qty: number) => void;
  removeOrder: (orderId: string) => void;
  /** Passo do checkout — regista a preferência de pagamento no pedido (já
   * criado desde o "Solicitar delivery"). Não cria nada novo nem limpa a
   * lista: o pedido continua o mesmo, agora com o método anexado. */
  confirmOrder: (orderId: string, paymentMethod: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartValue | null>(null);

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

function orderSubtotal(order: CartOrder): number {
  return order.lines.reduce((sum, line) => sum + lineUnitPrice(line) * line.qty, 0);
}

function orderDeliveryFee(order: CartOrder): number {
  return getRestaurant(order.restaurantId)?.deliveryFee ?? 0;
}

function orderTotal(order: CartOrder): number {
  return orderSubtotal(order) + orderDeliveryFee(order);
}

function seedOrders(): CartOrder[] {
  const seedItems = ["menu-601", "menu-shared-agua-601"]
    .map((id) => getMenuItem(id))
    .filter((m): m is NonNullable<typeof m> => Boolean(m));
  if (seedItems.length === 0) return [];
  const restaurant = getRestaurant(seedItems[0]!.restaurantId);
  return [
    {
      id: "order-seed-1",
      restaurantId: seedItems[0]!.restaurantId,
      lines: seedItems.map((m) => ({
        key: makeLineKey(m.id, []),
        menuItemId: m.id,
        qty: 1,
        selectedIngredients: [],
      })),
      createdAt: new Date().toISOString(),
      deliveryAddress:
        INITIAL_SAVED_ADDRESSES.find((a) => a.isDefault) ?? INITIAL_SAVED_ADDRESSES[0]!,
      status: "A caminho",
      estimatedMinutes: restaurant?.estimatedDeliveryMinutes ?? 30,
    },
  ];
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<CartOrder[]>(seedOrders);

  const value = useMemo<CartValue>(() => {
    const subtotal = orders.reduce((sum, o) => sum + orderSubtotal(o), 0);
    const deliveryFee = orders.reduce((sum, o) => sum + orderDeliveryFee(o), 0);

    return {
      orders,
      // Contagem por PEDIDO de entrega, não por produto — vários pratos no
      // mesmo "Solicitar delivery" continuam a contar como 1 no emblema.
      count: orders.length,
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
      orderSubtotal,
      orderTotal,
      // Sempre cria um pedido NOVO — cada "Solicitar delivery" é um delivery
      // à parte, mesmo que já haja um pedido pendente do mesmo restaurante.
      addOrder: (restaurantId, items, deliveryAddress) =>
        setOrders((prev) => [
          ...prev,
          {
            id: `order-${Date.now()}`,
            restaurantId,
            lines: items.map((item) => ({
              key: makeLineKey(item.menuItemId, item.selectedIngredients ?? []),
              menuItemId: item.menuItemId,
              qty: item.qty,
              selectedIngredients: item.selectedIngredients ?? [],
            })),
            createdAt: new Date().toISOString(),
            deliveryAddress,
            status: "Pedido enviado — a aguardar confirmação do restaurante",
            estimatedMinutes: getRestaurant(restaurantId)?.estimatedDeliveryMinutes ?? 30,
          },
        ]),
      setQty: (orderId, key, qty) =>
        setOrders((prev) =>
          prev
            .map((o) =>
              o.id !== orderId
                ? o
                : {
                    ...o,
                    lines:
                      qty <= 0
                        ? o.lines.filter((l) => l.key !== key)
                        : o.lines.map((l) => (l.key === key ? { ...l, qty } : l)),
                  },
            )
            .filter((o) => o.lines.length > 0),
        ),
      removeOrder: (orderId) => setOrders((prev) => prev.filter((o) => o.id !== orderId)),
      confirmOrder: (orderId, paymentMethod) =>
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, paymentMethod } : o))),
      clear: () => setOrders([]),
    };
  }, [orders]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
