import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getMenuItem, getRestaurant } from "@/data/helpers";
import type { PromoEffect } from "@/data/offers-store";
import { computeDeliveryFee } from "@/data/platform-settings-store";
import { INITIAL_SAVED_ADDRESSES } from "@/data/mockData";
import { useAuth } from "@/lib/auth";
import { viewerKey } from "@/lib/customer";
import { orderDistanceKm } from "@/lib/delivery-eval";
import type { FulfillmentType, SavedAddress, SelectedIngredient } from "@/data/types";

// Sufixo de versão: subir quando `seedOrders()` mudar de forma relevante —
// invalida o snapshot antigo do localStorage, que de outro modo continua a
// esconder os pedidos novos da seed.
const STORAGE_KEY = "luku_cart_orders_v3";

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
 *
 * Como não há backend real, o painel do restaurante (`/admin`) lê os
 * MESMOS pedidos daqui (filtrados por `restaurantId`) — é o que faz o
 * "Aceitar"/"A caminho"/"Entregue" do lado do restaurante aparecer de
 * imediato do lado do cliente em `/entrega`, no mesmo navegador.
 */
/** Código de estado do pedido — o texto exibido vem de `t("entrega.status." + status)`,
 * nunca guardado já traduzido (senão trocar de idioma não atualizava pedidos existentes). */
export type CartOrderStatus =
  | "pending"
  | "accepted"
  | "onTheWay"
  | "delivered"
  | "ready"
  | "completed"
  | "rejected"
  | "canceled";

export type CartOrder = {
  id: string;
  restaurantId: string;
  /** Dono do pedido no lado do cliente (`viewerKey` no momento do pedido:
   * conta autenticada ou convidado). Ausente nos pedidos da seed — que por
   * isso nunca aparecem em `/entrega` como sendo de quem está a ver. */
  ownerKey?: string;
  lines: CartLine[];
  createdAt: string;
  /** Como o pedido é recebido/consumido. `delivery` usa `deliveryAddress`;
   * `takeaway` usa `pickupAsap`/`pickupAt`; `dinein` usa `partySize`. */
  fulfillmentType: FulfillmentType;
  /** Cliente que fez o pedido — capturado da conta no momento do pedido, é
   * o que o restaurante vê no painel (nome, telefone, email para contacto). */
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  /** Só em `delivery`. */
  deliveryAddress?: SavedAddress;
  /** `takeaway`: `true` = levantar assim que estiver pronto; senão `pickupAt`. */
  pickupAsap?: boolean;
  /** `takeaway`: hora de levantamento agendada (ISO). */
  pickupAt?: string;
  /** `dinein`: nº de pessoas à mesa. */
  partySize?: number;
  status: CartOrderStatus;
  /** Estimativa (minutos) capturada do restaurante no momento do pedido. */
  estimatedMinutes: number;
  /** ISO — quando o pedido passou a "delivered". Base da estimativa de
   * entrega por histórico (ver `@/lib/delivery-history`). */
  deliveredAt?: string;
  /** Método de pagamento EXIGIDO pelo restaurante — definido por ele ao
   * aceitar o pedido (`acceptOrder`). É o que o cliente vê na confirmação.
   * Id de `paymentMethods` (`@/lib/mock-data`). A Luku não processa o
   * pagamento; o cliente combina-o diretamente com o restaurante. */
  paymentMethod?: string;
  /** Caução (Kz) exigida como garantia para este pedido — anexada pelo
   * restaurante ao aceitar, quando o modo está em `cautionModesForOrders`. */
  cautionRequired?: number;
  /** Observação livre do cliente para o restaurante (ex: "sem cebola",
   * "entregar na portaria") — escrita ao fazer o pedido. */
  note?: string;
  /** Código promocional aplicado no momento do pedido, com o efeito já
   * resolvido (a promoção pode mudar ou desaparecer depois — o pedido
   * mantém o que valia na altura). Ver `resolvePromoCode` em
   * `@/data/offers-store`. */
  promoCode?: string;
  promoLabel?: string;
  /** 0–100, desconto sobre o subtotal de produtos. */
  promoPercentOff?: number;
  promoFreeDelivery?: boolean;
  /** Comprovativo de pagamento carregado pelo cliente (data URL de imagem),
   * depois de o restaurante aceitar e fixar o método exigido. */
  paymentProof?: string;
  /** ISO — quando o comprovativo foi carregado. */
  paymentProofAt?: string;
};

type NewCartLine = {
  menuItemId: string;
  qty: number;
  selectedIngredients?: SelectedIngredient[];
};

/** Dados do modo de pedido, passados ao `addOrder`. */
export type OrderFulfillment =
  | { type: "delivery"; deliveryAddress: SavedAddress }
  | { type: "takeaway"; pickupAsap: boolean; pickupAt?: string }
  | { type: "dinein"; partySize: number };

type CartValue = {
  orders: CartOrder[];
  /** `false` até o efeito de hidratação (localStorage) correr — usado por
   * quem faz diffs sobre `orders` (ex.: notificações) para não confundir a
   * troca seed → dados persistidos com pedidos "novos". */
  hydrated: boolean;
  count: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  orderSubtotal: (order: CartOrder) => number;
  /** Desconto (Kz) do código promocional deste pedido — 0 quando não há. */
  orderDiscount: (order: CartOrder) => number;
  orderTotal: (order: CartOrder) => number;
  addOrder: (
    restaurantId: string,
    items: NewCartLine[],
    fulfillment: OrderFulfillment,
    note?: string,
    promo?: PromoEffect | null,
  ) => void;
  setQty: (orderId: string, lineKey: string, qty: number) => void;
  removeOrder: (orderId: string) => void;
  /** Cliente cancela o próprio pedido — só possível enquanto "pending" (o
   * restaurante ainda não aceitou). Vira estado "canceled", não é apagado,
   * para o restaurante continuar a ver o que aconteceu. */
  cancelOrder: (orderId: string) => void;
  /** Restaurante aceita o pedido (`/admin/pedidos`): fixa o método de
   * pagamento exigido e, se aplicável, a caução — e passa a "accepted". É o
   * que o cliente vê depois como exigência na confirmação. */
  acceptOrder: (orderId: string, paymentMethod: string, cautionRequired?: number) => void;
  /** Cliente anexa (ou substitui) o comprovativo de pagamento — data URL de
   * imagem. `null` remove. Visível de imediato no painel do restaurante. */
  setPaymentProof: (orderId: string, dataUrl: string | null) => void;
  /** @deprecated Passo antigo do checkout do cliente — substituído por
   * `acceptOrder` (o restaurante é que fixa o pagamento). Mantido até o
   * fluxo do cliente ser migrado. */
  confirmOrder: (orderId: string, paymentMethod: string, note?: string) => void;
  /** Usado pelo painel do restaurante (`/admin/pedidos`) pra avançar o
   * pedido. Delivery: accepted → onTheWay → delivered. Takeaway/dinein:
   * accepted → ready → completed. Ou pending → rejected. */
  updateOrderStatus: (orderId: string, status: CartOrderStatus) => void;
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

/** Rótulos das personalizações de uma linha — ex: ["sem Cebola", "+ Bacon"].
 * `t` fornece os prefixos traduzidos ("sem" / "+"). */
export function lineCustomizations(
  line: CartLine,
  removedLabel: string,
  addedLabel: string,
): string[] {
  const menuItem = getMenuItem(line.menuItemId);
  if (!menuItem) return [];
  const out: string[] = [];
  for (const sel of line.selectedIngredients) {
    const def = menuItem.ingredients.find((i) => i.id === sel.id);
    if (!def) continue;
    if (def.extraPrice) {
      if (sel.included) out.push(`${addedLabel} ${def.name}`);
    } else if (def.removable && !sel.included) {
      out.push(`${removedLabel} ${def.name}`);
    }
  }
  return out;
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

/** Desconto do código promocional — percentagem sobre o subtotal de
 * produtos, arredondada. 0 quando o pedido não tem código ou o código só
 * dá entrega grátis. */
function orderDiscount(order: CartOrder): number {
  if (!order.promoPercentOff) return 0;
  return Math.round(orderSubtotal(order) * (order.promoPercentOff / 100));
}

/** Taxa de entrega: taxa única do restaurante (cobre até ao raio da
 * política da plataforma) + acréscimo por km acima disso. `promoFreeDelivery`
 * zera tudo. Ver `computeDeliveryFee` / `getDeliveryPolicy`. */
function orderDeliveryFee(order: CartOrder): number {
  if (order.fulfillmentType !== "delivery") return 0;
  if (order.promoFreeDelivery) return 0;
  const base = getRestaurant(order.restaurantId)?.deliveryFee ?? 0;
  return computeDeliveryFee(base, orderDistanceKm(order));
}

function orderTotal(order: CartOrder): number {
  return orderSubtotal(order) - orderDiscount(order) + orderDeliveryFee(order);
}

/** Clientes fictícios para os pedidos seed. Alguns nomes coincidem de
 * propósito com os das reservas mockadas, para o painel de Clientes cruzar
 * pedidos + reservas da mesma pessoa. */
const SEED_CUSTOMERS: { name: string; phone: string; email: string }[] = [
  { name: "Manuel Neto", phone: "+244 923 111 222", email: "manuel.neto@gmail.com" },
  { name: "Ana Paula Silva", phone: "+244 912 888 999", email: "anapaula.silva@gmail.com" },
  { name: "Filomena Costa", phone: "+244 927 456 111", email: "filomena.costa@gmail.com" },
  { name: "Rui Fernandes", phone: "+244 923 777 010", email: "rui.fernandes@gmail.com" },
  { name: "Cátia Lourenço", phone: "+244 928 552 667", email: "catia.lourenco@gmail.com" },
  { name: "Nelson Adão", phone: "+244 921 004 887", email: "nelson.adao@gmail.com" },
];

function seedCustomerFor(id: string) {
  const n = Array.from(id).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return SEED_CUSTOMERS[n % SEED_CUSTOMERS.length]!;
}

/** Um pedido seed a partir de ids de prato reais — usado para dar aos
 * painéis de Pedidos/Estatísticas de vários restaurantes (não só um) algo
 * para mostrar logo de início, sem precisar de criar pedidos a viver o
 * fluxo todo primeiro. */
function buildSeedOrder(
  id: string,
  menuItemIds: string[],
  status: CartOrderStatus,
  daysAgo: number,
  extra?: {
    note?: string;
    paymentMethod?: string;
    hoursAgo?: number;
    addressIndex?: number;
    customerIndex?: number;
    fulfillmentType?: FulfillmentType;
    partySize?: number;
  },
): CartOrder | null {
  const items = menuItemIds
    .map((mid) => getMenuItem(mid))
    .filter((m): m is NonNullable<typeof m> => Boolean(m));
  if (items.length === 0) return null;
  const restaurant = getRestaurant(items[0]!.restaurantId);
  const createdAt = new Date();
  createdAt.setDate(createdAt.getDate() - daysAgo);
  if (extra?.hoursAgo) createdAt.setHours(createdAt.getHours() - extra.hoursAgo);

  // Entregas seed ganham um `deliveredAt` plausível — a estimativa de entrega
  // por histórico (`@/lib/delivery-history`) precisa de durações reais. A
  // duração varia com a hora do pedido (rush ao almoço/jantar) e com o id.
  let deliveredAt: string | undefined;
  if (status === "delivered") {
    const base = restaurant?.estimatedDeliveryMinutes ?? 30;
    const hour = createdAt.getHours();
    const rush = (hour >= 11 && hour <= 13) || (hour >= 18 && hour <= 20) ? 1.3 : 1;
    let seed = 0;
    for (let i = 0; i < id.length; i += 1) seed = (seed * 31 + id.charCodeAt(i)) >>> 0;
    const jitter = (seed % 21) - 8; // -8..+12 min
    const durationMin = Math.max(12, Math.round(base * rush + jitter));
    deliveredAt = new Date(createdAt.getTime() + durationMin * 60_000).toISOString();
  }
  const addr =
    (extra?.addressIndex != null && INITIAL_SAVED_ADDRESSES[extra.addressIndex]) ||
    INITIAL_SAVED_ADDRESSES.find((a) => a.isDefault) ||
    INITIAL_SAVED_ADDRESSES[0]!;
  const customer =
    (extra?.customerIndex != null && SEED_CUSTOMERS[extra.customerIndex]) || seedCustomerFor(id);
  const fulfillmentType: FulfillmentType = extra?.fulfillmentType ?? "delivery";
  return {
    id,
    restaurantId: items[0]!.restaurantId,
    lines: items.map((m) => ({
      key: makeLineKey(m.id, []),
      menuItemId: m.id,
      qty: 1,
      selectedIngredients: [],
    })),
    createdAt: createdAt.toISOString(),
    fulfillmentType,
    customerName: customer.name,
    customerPhone: customer.phone,
    customerEmail: customer.email,
    ...(fulfillmentType === "delivery" ? { deliveryAddress: addr } : {}),
    ...(fulfillmentType === "takeaway" ? { pickupAsap: true } : {}),
    ...(fulfillmentType === "dinein" ? { partySize: extra?.partySize ?? 2 } : {}),
    status,
    estimatedMinutes: restaurant?.estimatedDeliveryMinutes ?? 30,
    ...(deliveredAt ? { deliveredAt } : {}),
    ...(extra?.paymentMethod ? { paymentMethod: extra.paymentMethod } : {}),
    ...(extra?.note ? { note: extra.note } : {}),
  };
}

function seedOrders(): CartOrder[] {
  return [
    buildSeedOrder("order-seed-1", ["menu-601", "menu-shared-agua-601"], "onTheWay", 0),
    buildSeedOrder("order-seed-2", ["menu-101"], "delivered", 2),
    buildSeedOrder("order-seed-3", ["menu-302"], "pending", 0, { fulfillmentType: "dinein" }),

    // --- Bistrô Sabor & Arte (rest-1): histórico alargado para os painéis
    // de Pedidos e Estatísticas. ---
    buildSeedOrder("order-b1", ["menu-101"], "pending", 0, {
      note: "Sem jindungo, por favor.",
      hoursAgo: 1,
    }),
    buildSeedOrder("order-b2", ["menu-102", "menu-104"], "pending", 0, {
      hoursAgo: 3,
      addressIndex: 1,
    }),
    buildSeedOrder("order-b3", ["menu-103"], "ready", 0, {
      paymentMethod: "multicaixa-express",
      hoursAgo: 2,
      fulfillmentType: "takeaway",
    }),
    buildSeedOrder("order-b4", ["menu-101", "menu-105"], "onTheWay", 0, {
      paymentMethod: "Numerário",
      hoursAgo: 1,
      addressIndex: 1,
    }),
    buildSeedOrder("order-b5", ["menu-104"], "delivered", 1, {
      paymentMethod: "Multicaixa Express",
    }),
    buildSeedOrder("order-b6", ["menu-102"], "delivered", 2, { paymentMethod: "Numerário" }),
    buildSeedOrder("order-b7", ["menu-101", "menu-103"], "delivered", 3, {
      paymentMethod: "Multicaixa Express",
      note: "Entregar na portaria.",
      addressIndex: 1,
    }),
    buildSeedOrder("order-b8", ["menu-106"], "delivered", 4),
    buildSeedOrder("order-b9", ["menu-105"], "rejected", 2, { note: "Fora da área de entrega." }),
    buildSeedOrder("order-b10", ["menu-102", "menu-104", "menu-106"], "delivered", 5, {
      paymentMethod: "Numerário",
    }),
    buildSeedOrder("order-b11", ["menu-101"], "delivered", 6, {
      paymentMethod: "Multicaixa Express",
      addressIndex: 1,
    }),
    buildSeedOrder("order-b12", ["menu-103"], "delivered", 8, { paymentMethod: "Numerário" }),
  ].filter((o): o is CartOrder => o !== null);
}

/** Pedidos guardados antes de existir `fulfillmentType` chegam sem modo —
 * atribui um a partir dos campos presentes, para nada renderizar
 * "fulfillment.undefined". O efeito de persistência volta a gravá-los já
 * corrigidos. */
function normalizeOrder(o: CartOrder): CartOrder {
  if (o.fulfillmentType) return o;
  const fulfillmentType: FulfillmentType = o.deliveryAddress
    ? "delivery"
    : o.pickupAsap || o.pickupAt
      ? "takeaway"
      : o.partySize
        ? "dinein"
        : "delivery";
  return { ...o, fulfillmentType };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<CartOrder[]>(seedOrders);
  const [hydrated, setHydrated] = useState(false);

  // Carrega pedidos persistidos (se houver) por cima da seed, uma vez, no
  // cliente — assim o painel do restaurante e a página do cliente
  // continuam a ver os mesmos pedidos depois de um reload da página.
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setOrders((JSON.parse(stored) as CartOrder[]).map(normalizeOrder));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  }, [orders, hydrated]);

  const value = useMemo<CartValue>(() => {
    const subtotal = orders.reduce((sum, o) => sum + orderSubtotal(o), 0);
    const deliveryFee = orders.reduce((sum, o) => sum + orderDeliveryFee(o), 0);
    const discount = orders.reduce((sum, o) => sum + orderDiscount(o), 0);

    // Contagem por PEDIDO de entrega, não por produto — vários pratos no
    // mesmo "Solicitar delivery" continuam a contar como 1 no emblema. Só
    // os pedidos DESTE usuário (ou convidado) — sem isto, o emblema (Bike
    // no header/tab bar) mostrava também os pedidos da seed (sem
    // `ownerKey`), aparecendo logo de início mesmo num browser novo.
    const mineKey = viewerKey(user);
    const count = orders.filter((o) => o.ownerKey === mineKey).length;

    return {
      orders,
      hydrated,
      count,
      subtotal,
      deliveryFee,
      total: subtotal - discount + deliveryFee,
      orderSubtotal,
      orderDiscount,
      orderTotal,
      // Sempre cria um pedido NOVO — cada "Solicitar delivery" é um delivery
      // à parte, mesmo que já haja um pedido pendente do mesmo restaurante.
      addOrder: (restaurantId, items, fulfillment, note, promo) =>
        setOrders((prev) => [
          ...prev,
          {
            id: `order-${Date.now()}`,
            restaurantId,
            ownerKey: viewerKey(user),
            lines: items.map((item) => ({
              key: makeLineKey(item.menuItemId, item.selectedIngredients ?? []),
              menuItemId: item.menuItemId,
              qty: item.qty,
              selectedIngredients: item.selectedIngredients ?? [],
            })),
            createdAt: new Date().toISOString(),
            fulfillmentType: fulfillment.type,
            customerName: user?.name ?? "Cliente Luku",
            customerPhone: user?.phone ?? "",
            ...(user?.email ? { customerEmail: user.email } : {}),
            ...(fulfillment.type === "delivery"
              ? { deliveryAddress: fulfillment.deliveryAddress }
              : {}),
            ...(fulfillment.type === "takeaway"
              ? {
                  pickupAsap: fulfillment.pickupAsap,
                  ...(fulfillment.pickupAt ? { pickupAt: fulfillment.pickupAt } : {}),
                }
              : {}),
            ...(fulfillment.type === "dinein" ? { partySize: fulfillment.partySize } : {}),
            status: "pending",
            estimatedMinutes: getRestaurant(restaurantId)?.estimatedDeliveryMinutes ?? 30,
            ...(note?.trim() ? { note: note.trim() } : {}),
            ...(promo
              ? {
                  promoCode: promo.code,
                  promoLabel: promo.label,
                  ...(promo.percentOff ? { promoPercentOff: promo.percentOff } : {}),
                  ...(promo.freeDelivery ? { promoFreeDelivery: true } : {}),
                }
              : {}),
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
      cancelOrder: (orderId) =>
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId && o.status === "pending" ? { ...o, status: "canceled" } : o,
          ),
        ),
      acceptOrder: (orderId, paymentMethod, cautionRequired) =>
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  status: "accepted",
                  paymentMethod,
                  ...(cautionRequired && cautionRequired > 0 ? { cautionRequired } : {}),
                }
              : o,
          ),
        ),
      confirmOrder: (orderId, paymentMethod, note) =>
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? { ...o, paymentMethod, ...(note !== undefined ? { note: note.trim() } : {}) }
              : o,
          ),
        ),
      setPaymentProof: (orderId, dataUrl) =>
        setOrders((prev) =>
          prev.map((o) => {
            if (o.id !== orderId) return o;
            if (!dataUrl) {
              const { paymentProof: _p, paymentProofAt: _a, ...rest } = o;
              return rest;
            }
            return { ...o, paymentProof: dataUrl, paymentProofAt: new Date().toISOString() };
          }),
        ),
      updateOrderStatus: (orderId, status) =>
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  status,
                  ...(status === "delivered" && !o.deliveredAt
                    ? { deliveredAt: new Date().toISOString() }
                    : {}),
                }
              : o,
          ),
        ),
      clear: () => setOrders([]),
    };
  }, [orders, hydrated, user]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
