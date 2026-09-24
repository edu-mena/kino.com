import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  acceptApiOrder,
  cancelApiOrder,
  createApiOrder,
  dispatchApiOrder,
  fetchApiOrdersForRestaurant,
  fetchMyApiOrders,
  storeApiInvoice,
  storeApiPaymentProof,
  updateApiOrderStatus,
} from "@/data/api-orders";
import { getMenuItem, getRestaurant } from "@/data/helpers";
import { discountableSubtotal, type PromoEffect } from "@/data/offers-store";
import { computeDeliveryFee } from "@/data/platform-settings-store";
import { INITIAL_SAVED_ADDRESSES } from "@/data/mockData";
import { hasRealBackend } from "@/lib/api-client";
import { getAuthToken, useAuth } from "@/lib/auth";
import { viewerKey } from "@/lib/customer";
import { orderDistanceKm } from "@/lib/delivery-eval";
import { getAdminToken, useManagedRestaurantId } from "@/lib/restaurant-admin";
import { useReservations } from "@/lib/reservations";
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
  /** Snapshot vindo do backend real (`OrderResource`) — nome/preço/
   * ingredientes TAL COMO ESTAVAM no momento do pedido, não recalculado do
   * catálogo local (mock), que pode nem conhecer este prato para um
   * restaurante real. Ausentes em pedidos do modo demo, que continuam a
   * resolver via `getMenuItem()` (ver `lineName`/`lineUnitPrice`/
   * `lineCustomizations`). */
  name?: string;
  unitPrice?: number;
  lineTotal?: number;
  ingredientsSnapshot?: {
    id: string;
    name: string;
    included: boolean;
    extraPrice: number | null;
  }[];
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
  /** Só presentes com backend real (a lista "meus pedidos" atravessa vários
   * restaurantes — ver api-orders.ts) — usados por `entrega.tsx` em vez de
   * `getRestaurant(order.restaurantId)` (mock, não conhece restaurantes
   * reais). */
  restaurantName?: string;
  restaurantImage?: string;
  /** Só presentes com backend real — snapshot calculado no servidor no
   * momento da criação (nunca recalculado, ao contrário do mock via
   * `orderSubtotal`/`orderDeliveryFee`/`orderTotal` abaixo, que lê o preço
   * ATUAL do prato — bug conhecido do mock, corrigido no backend). */
  subtotal?: number;
  deliveryFee?: number;
  total?: number;
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
  /** Conta/número para onde pagar `paymentMethod` — só presente com backend
   * real, calculado no servidor (ver `OrderResource.php`, `paymentDestination`)
   * a partir do único método já exigido neste pedido; nunca a lista
   * completa de contas do restaurante, que é staff-only. Sem mock
   * equivalente — no modo demo o restaurante não tem contas configuradas. */
  paymentDestination?: string;
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
  /** Pratos/categorias aos quais o desconto se restringia no momento do
   * pedido (mock — no backend real isto só existe do lado do servidor,
   * `total` já vem com o desconto certo aplicado). Ambos vazios/ausentes =
   * desconto do pedido inteiro. Ver `discountableSubtotal`, `@/data/offers-store`. */
  promoTargetMenuItemIds?: string[];
  promoTargetCategories?: string[];
  /** Comprovativo de pagamento carregado pelo cliente (data URL de imagem),
   * depois de o restaurante aceitar e fixar o método exigido. */
  paymentProof?: string;
  /** ISO — quando o comprovativo foi carregado. */
  paymentProofAt?: string;
  /** Fatura carregada pelo restaurante (data URL — imagem ou PDF), visível
   * ao cliente em `/entrega`. Ausente até o restaurante a emitir. */
  invoice?: string;
  /** `"nif"` = fatura com o NIF da empresa do cliente; ausente/`"normal"` =
   * fatura simples de consumidor final. Escolhido pelo RESTAURANTE ao
   * emitir a fatura (`admin.pedidos.tsx`) — pré-selecionado como "nif"
   * quando `wantsNifInvoice` for `true`, mas continua editável por ele. */
  invoiceType?: "normal" | "nif";
  /** ISO — quando a fatura foi carregada. */
  invoiceAt?: string;
  /** Cliente pediu fatura com NIF no momento do pedido (checkbox em
   * `order-builder-card.tsx`) — só presente com backend real. */
  wantsNifInvoice?: boolean;
  /** Snapshot (nome/nif/email) da empresa escolhida no momento do pedido —
   * mesmo raciocínio de `deliveryAddress` (não muda se a empresa for
   * editada depois). Visível ao restaurante para saber o que pôr na
   * fatura que emitir. */
  invoiceCompany?: { name: string; nif: string; email: string };
  /** Estafeta a caminho — só presente com backend real enquanto o pedido
   * está "on_the_way" (ver `OrderResource::courier`, carregado em
   * `OrderController::show`/`mine`). No mock, ver `@/lib/couriers`
   * (`readCourierForOrder`) em vez disto. */
  courier?: { name: string; phone: string; vehicle: string };
  /** Desconto (Kz) da caução já paga de uma reserva confirmada, aplicado
   * automaticamente a um pedido dine-in ligado a ela (ver
   * `order-builder-card.tsx`, passo dine-in). Já vem subtraído de `total` —
   * isto é só para mostrar a linha "Caução da reserva aplicada" ao
   * cliente/restaurante, nunca escondida quando presente. */
  reservationCredit?: number;
};

export type NewCartLine = {
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
  /** `ok: false` = a criação falhou (validação do backend ou erro de rede)
   * — o pedido pode não ter sido gravado. Antes era `void`
   * (fire-and-forget): quem chamava mostrava sempre "sucesso" mesmo quando
   * a API rejeitava o pedido, e o pedido nunca aparecia em lado nenhum. */
  addOrder: (
    restaurantId: string,
    items: NewCartLine[],
    fulfillment: OrderFulfillment,
    note?: string,
    promo?: PromoEffect | null,
    /** Fatura com NIF pedida pelo cliente (ver plano) — exige conta,
     * `companyId` de uma empresa já guardada (`useCompanies`). */
    invoice?: { wantsNifInvoice: boolean; companyId?: string },
    /** Reserva confirmada, com caução já paga, deste restaurante — o pedido
     * dine-in liga-se a ela e a caução desconta automaticamente do consumo
     * (ver `order-builder-card.tsx`, passo dine-in). */
    reservationId?: string,
  ) => Promise<boolean>;
  setQty: (orderId: string, lineKey: string, qty: number) => void;
  removeOrder: (orderId: string) => void;
  /** Cliente cancela o próprio pedido — só possível enquanto "pending" (o
   * restaurante ainda não aceitou). Vira estado "canceled", não é apagado,
   * para o restaurante continuar a ver o que aconteceu. `ok: false` = falha
   * real (antes fire-and-forget: o pedido continuava "pending" em silêncio
   * e o botão de cancelar continuava disponível, como se nada tivesse sido
   * tentado). */
  cancelOrder: (orderId: string) => Promise<boolean>;
  /** Restaurante aceita o pedido (`/admin/pedidos`): fixa o método de
   * pagamento exigido e, se aplicável, a caução — e passa a "accepted". É o
   * que o cliente vê depois como exigência na confirmação. `ok: false` =
   * falha real — mesmo problema do `cancelOrder`, confirmado ao vivo: o
   * toast de sucesso disparava sempre e o botão "Aceitar pedido" continuava
   * disponível porque o pedido nunca saía de "pending" no servidor. */
  acceptOrder: (
    orderId: string,
    paymentMethod: string,
    cautionRequired?: number,
  ) => Promise<boolean>;
  /** Cliente anexa (ou substitui) o comprovativo de pagamento — data URL de
   * imagem. `null` remove. Visível de imediato no painel do restaurante.
   * `ok: false` = falha real (upload rejeitado, tamanho excedido, etc.). */
  setPaymentProof: (orderId: string, dataUrl: string | null) => Promise<boolean>;
  /** Restaurante emite (ou substitui) a fatura — data URL de imagem ou PDF.
   * `null` remove. Visível de imediato ao cliente em `/entrega`. `ok: false`
   * = falha real. */
  setInvoice: (
    orderId: string,
    dataUrl: string | null,
    type?: "normal" | "nif",
  ) => Promise<boolean>;
  /** @deprecated Passo antigo do checkout do cliente — substituído por
   * `acceptOrder` (o restaurante é que fixa o pagamento). Mantido até o
   * fluxo do cliente ser migrado. */
  confirmOrder: (orderId: string, paymentMethod: string, note?: string) => void;
  /** Usado pelo painel do restaurante (`/admin/pedidos`) pra avançar o
   * pedido. Delivery: accepted → onTheWay → delivered. Takeaway/dinein:
   * accepted → ready → completed. Ou pending → rejected. `ok: false` =
   * falha real. */
  updateOrderStatus: (orderId: string, status: CartOrderStatus) => Promise<boolean>;
  /** "Aceite" → "A caminho": atribui o estafeta e avança o estado numa só
   * chamada com backend real (ver OrderController::dispatch — atómico no
   * servidor). Sem backend, quem chama continua a usar `assign` (courier)
   * + `updateOrderStatus("onTheWay")` em separado, como sempre. `ok: false`
   * = falha real. */
  dispatchOrder: (orderId: string, courierId: string) => Promise<boolean>;
  clear: () => void;
};

const CartContext = createContext<CartValue | null>(null);

/** Preço unitário de uma linha: preço base do prato + extras selecionados com custo. */
export function lineUnitPrice(line: CartLine): number {
  if (line.unitPrice != null) return line.unitPrice;
  const menuItem = getMenuItem(line.menuItemId);
  if (!menuItem) return 0;
  const extras = line.selectedIngredients
    .filter((s) => s.included)
    .reduce((sum, s) => {
      const def = menuItem.ingredients.find((i) => i.id === s.id);
      return sum + (def?.extraPrice ?? 0);
    }, 0);
  return (menuItem.price ?? 0) + extras;
}

/** Nome do prato desta linha — prefere o snapshot do pedido real (nunca
 * muda, mesmo que o prato seja renomeado/apagado depois), cai no catálogo
 * local só para pedidos do modo demo. */
export function lineName(line: CartLine): string {
  return line.name ?? getMenuItem(line.menuItemId)?.name ?? "";
}

/** Rótulos das personalizações de uma linha — ex: ["sem Cebola", "+ Bacon"].
 * `t` fornece os prefixos traduzidos ("sem" / "+"). */
export function lineCustomizations(
  line: CartLine,
  removedLabel: string,
  addedLabel: string,
): string[] {
  if (line.ingredientsSnapshot) {
    const out: string[] = [];
    for (const ing of line.ingredientsSnapshot) {
      if (ing.extraPrice != null) {
        if (ing.included) out.push(`${addedLabel} ${ing.name}`);
      } else if (!ing.included) {
        out.push(`${removedLabel} ${ing.name}`);
      }
    }
    return out;
  }
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
  if (order.subtotal != null) return order.subtotal;
  return order.lines.reduce((sum, line) => sum + lineUnitPrice(line) * line.qty, 0);
}

/** Desconto do código promocional — percentagem sobre o subtotal de
 * produtos (ou só do subtotal dos pratos/categorias alvo, ver Fase K1),
 * arredondada. 0 quando o pedido não tem código ou o código só dá entrega
 * grátis. */
function orderDiscount(order: CartOrder): number {
  if (!order.promoPercentOff) return 0;
  if (order.total != null) {
    // Pedido real — `total` já veio do servidor com o desconto certo
    // aplicado (com ou sem alvo, ver OrderPricingService::price). Deriva o
    // valor do desconto a partir daí em vez de recalcular sobre o subtotal
    // inteiro, que ficaria errado numa promoção com alvo.
    return Math.max(
      0,
      orderSubtotal(order) + orderDeliveryFee(order) - (order.reservationCredit ?? 0) - order.total,
    );
  }
  const hasTarget = !!(order.promoTargetMenuItemIds?.length || order.promoTargetCategories?.length);
  const base = hasTarget
    ? discountableSubtotal(
        order.lines.map((line) => ({
          menuItemId: line.menuItemId,
          category: getMenuItem(line.menuItemId)?.category,
          lineTotal: lineUnitPrice(line) * line.qty,
        })),
        {
          targetMenuItemIds: order.promoTargetMenuItemIds ?? [],
          targetCategories: order.promoTargetCategories ?? [],
        },
      )
    : orderSubtotal(order);
  return Math.round(base * (order.promoPercentOff / 100));
}

/** Taxa de entrega: taxa única do restaurante (cobre até ao raio da
 * política da plataforma) + acréscimo por km acima disso. `promoFreeDelivery`
 * zera tudo. Ver `computeDeliveryFee` / `getDeliveryPolicy`. */
function orderDeliveryFee(order: CartOrder): number {
  if (order.deliveryFee != null) return order.deliveryFee;
  if (order.fulfillmentType !== "delivery") return 0;
  if (order.promoFreeDelivery) return 0;
  const base = getRestaurant(order.restaurantId)?.deliveryFee ?? 0;
  return computeDeliveryFee(base, orderDistanceKm(order));
}

function orderTotal(order: CartOrder): number {
  if (order.total != null) return order.total;
  const credit = order.reservationCredit ?? 0;
  return Math.max(
    0,
    orderSubtotal(order) - orderDiscount(order) + orderDeliveryFee(order) - credit,
  );
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
  // Com backend real, um utilizador novo começa sem pedidos — este histórico
  // de demonstração (restaurantes/menu mock) só faz sentido sem backend.
  if (hasRealBackend) return [];
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
      paymentMethod: "multicaixa_express",
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
  const { reservations } = useReservations();
  // `null` em páginas de cliente (fora do painel) — ver `useManagedRestaurantId`
  // (@/lib/restaurant-admin) para porque não dá para usar
  // `useRestaurantAdminOptional` aqui (CartProvider vive no `__root`,
  // ancestral de `RestaurantAdminProvider`).
  const managedRestaurantId = useManagedRestaurantId();
  const [apiOrders, setApiOrders] = useState<CartOrder[]>([]);
  const [mockOrders, setMockOrders] = useState<CartOrder[]>(seedOrders);
  const [hydrated, setHydrated] = useState(false);

  /**
   * Com backend real, a fonte dos dados depende de ONDE a app está a ser
   * usada — mesmo raciocínio de `reservations.tsx`: dentro do painel do
   * restaurante, os pedidos DESSE restaurante (staff); fora dele (cliente),
   * "os meus pedidos" do utilizador autenticado, em qualquer restaurante.
   */
  const refetchApi = () => {
    if (managedRestaurantId) {
      const token = getAdminToken();
      if (!token) return setApiOrders([]);
      fetchApiOrdersForRestaurant(managedRestaurantId, token)
        .then(setApiOrders)
        .catch(() => setApiOrders([]));
      return;
    }
    const token = getAuthToken();
    if (!token) return setApiOrders([]);
    fetchMyApiOrders(token, viewerKey(user))
      .then(setApiOrders)
      .catch(() => setApiOrders([]));
  };

  useEffect(() => {
    if (hasRealBackend) refetchApi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [managedRestaurantId, user?.email, user?.phone]);

  // Carrega pedidos persistidos (se houver) por cima da seed, uma vez, no
  // cliente — assim o painel do restaurante e a página do cliente
  // continuam a ver os mesmos pedidos depois de um reload da página.
  useEffect(() => {
    if (hasRealBackend) return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setMockOrders((JSON.parse(stored) as CartOrder[]).map(normalizeOrder));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hasRealBackend || !hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockOrders));
  }, [mockOrders, hydrated]);

  // Sem backend real, o painel do restaurante e o cliente partilham o mesmo
  // localStorage — mas só a aba que escreve vê o novo estado de imediato; as
  // outras ficavam presas ao que tinham ao abrir. O evento `storage` do
  // browser dispara nas OUTRAS abas quando uma delas muda a chave — é o que
  // faz um pedido novo, ou uma mudança de estado, aparecer ao vivo (e disparar
  // a notificação certa) do outro lado sem precisar recarregar a página.
  useEffect(() => {
    if (hasRealBackend) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      if (e.newValue == null) {
        setMockOrders(seedOrders());
        return;
      }
      try {
        setMockOrders((JSON.parse(e.newValue) as CartOrder[]).map(normalizeOrder));
      } catch {
        // payload corrompido vindo doutra aba — mantém o que já temos.
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const orders = hasRealBackend ? apiOrders : mockOrders;

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
    const count = hasRealBackend
      ? orders.length
      : orders.filter((o) => o.ownerKey === mineKey).length;

    const base = {
      orders,
      count,
      subtotal,
      deliveryFee,
      total: subtotal - discount + deliveryFee,
      orderSubtotal,
      orderDiscount,
      orderTotal,
    };

    if (hasRealBackend) {
      return {
        ...base,
        hydrated: true,
        // Sempre cria um pedido NOVO — cada "Solicitar delivery" é um
        // delivery à parte, mesmo que já haja um pedido pendente do mesmo
        // restaurante.
        addOrder: async (restaurantId, items, fulfillment, note, promo, invoice, reservationId) => {
          const token = getAuthToken();
          try {
            await createApiOrder(
              restaurantId,
              items,
              fulfillment,
              note,
              promo,
              {
                ...(user?.name ? { customerName: user.name } : {}),
                ...(user?.phone ? { customerPhone: user.phone } : {}),
                ...(user?.email ? { customerEmail: user.email } : {}),
              },
              token,
              invoice,
              reservationId,
            );
            refetchApi();
            return true;
          } catch {
            return false;
          }
        },
        // Editar quantidades de um pedido já submetido não é suportado
        // pela API real (sem consumidores ativos hoje — ver auditoria).
        setQty: () => {},
        removeOrder: () => {},
        cancelOrder: async (orderId) => {
          const token = getAuthToken();
          try {
            await cancelApiOrder(orderId, token);
            refetchApi();
            return true;
          } catch {
            return false;
          }
        },
        acceptOrder: async (orderId, paymentMethod) => {
          const token = getAdminToken();
          if (!token) return false;
          try {
            await acceptApiOrder(orderId, paymentMethod, token);
            refetchApi();
            return true;
          } catch {
            return false;
          }
        },
        // @deprecated no mock também — nunca chamado, mantido só pela
        // interface.
        confirmOrder: () => {},
        setPaymentProof: async (orderId, dataUrl) => {
          if (!dataUrl) return false; // sem suporte a remover na API real
          const token = getAuthToken();
          try {
            await storeApiPaymentProof(orderId, dataUrl, token);
            refetchApi();
            return true;
          } catch {
            return false;
          }
        },
        setInvoice: async (orderId, dataUrl, type) => {
          if (!dataUrl) return false; // sem suporte a remover na API real
          const token = getAdminToken();
          if (!token) return false;
          try {
            await storeApiInvoice(orderId, dataUrl, token, type);
            refetchApi();
            return true;
          } catch {
            return false;
          }
        },
        updateOrderStatus: async (orderId, status) => {
          const token = getAdminToken();
          if (!token) return false;
          try {
            await updateApiOrderStatus(orderId, status, token);
            refetchApi();
            return true;
          } catch {
            return false;
          }
        },
        dispatchOrder: async (orderId, courierId) => {
          const token = getAdminToken();
          if (!token) return false;
          try {
            await dispatchApiOrder(orderId, courierId, token);
            refetchApi();
            return true;
          } catch {
            return false;
          }
        },
        clear: () => {},
      };
    }

    return {
      ...base,
      hydrated,
      addOrder: (restaurantId, items, fulfillment, note, promo, _invoice, reservationId) => {
        // Reserva confirmada, com caução paga, escolhida no passo dine-in —
        // mesmo raciocínio do backend real (OrderPricingService::price):
        // a caução nunca desconta mais do que o próprio consumo.
        const reservation = reservationId
          ? reservations.find((r) => r.id === reservationId)
          : undefined;
        const itemsSubtotal = reservation
          ? items.reduce((sum, item) => {
              const menuItem = getMenuItem(item.menuItemId);
              if (!menuItem) return sum;
              const extras = (item.selectedIngredients ?? [])
                .filter((s) => s.included)
                .reduce((s, sel) => {
                  const def = menuItem.ingredients.find((i) => i.id === sel.id);
                  return s + (def?.extraPrice ?? 0);
                }, 0);
              return sum + ((menuItem.price ?? 0) + extras) * item.qty;
            }, 0)
          : 0;

        setMockOrders((prev) => [
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
                  ...(promo.targetMenuItemIds.length
                    ? { promoTargetMenuItemIds: promo.targetMenuItemIds }
                    : {}),
                  ...(promo.targetCategories.length
                    ? { promoTargetCategories: promo.targetCategories }
                    : {}),
                }
              : {}),
            ...(reservation
              ? { reservationCredit: Math.min(reservation.cautionAmount, itemsSubtotal) }
              : {}),
          },
        ]);
        return Promise.resolve(true);
      },
      setQty: (orderId, key, qty) =>
        setMockOrders((prev) =>
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
      removeOrder: (orderId) => setMockOrders((prev) => prev.filter((o) => o.id !== orderId)),
      cancelOrder: (orderId) => {
        setMockOrders((prev) =>
          prev.map((o) =>
            o.id === orderId && o.status === "pending" ? { ...o, status: "canceled" } : o,
          ),
        );
        return Promise.resolve(true);
      },
      acceptOrder: (orderId, paymentMethod, cautionRequired) => {
        setMockOrders((prev) =>
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
        );
        return Promise.resolve(true);
      },
      confirmOrder: (orderId, paymentMethod, note) =>
        setMockOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? { ...o, paymentMethod, ...(note !== undefined ? { note: note.trim() } : {}) }
              : o,
          ),
        ),
      setPaymentProof: (orderId, dataUrl) => {
        setMockOrders((prev) =>
          prev.map((o) => {
            if (o.id !== orderId) return o;
            if (!dataUrl) {
              const { paymentProof: _p, paymentProofAt: _a, ...rest } = o;
              return rest;
            }
            return { ...o, paymentProof: dataUrl, paymentProofAt: new Date().toISOString() };
          }),
        );
        return Promise.resolve(true);
      },
      setInvoice: (orderId, dataUrl, type) => {
        setMockOrders((prev) =>
          prev.map((o) => {
            if (o.id !== orderId) return o;
            if (!dataUrl) {
              const { invoice: _i, invoiceAt: _at, invoiceType: _t, ...rest } = o;
              return rest;
            }
            return {
              ...o,
              invoice: dataUrl,
              invoiceAt: new Date().toISOString(),
              ...(type ? { invoiceType: type } : {}),
            };
          }),
        );
        return Promise.resolve(true);
      },
      updateOrderStatus: (orderId, status) => {
        setMockOrders((prev) =>
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
        );
        return Promise.resolve(true);
      },
      // Sem backend real, o mock não separa dispatch de update genérico —
      // quem chama continua a fazer `assign` (courier) + `updateOrderStatus`
      // em dois passos (ver admin.pedidos.tsx `dispatch()`).
      dispatchOrder: () => Promise.resolve(true),
      clear: () => setMockOrders([]),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, hydrated, user, reservations]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
