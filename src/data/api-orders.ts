import { apiFetch } from "@/lib/api-client";
import { dataUrlToFile } from "@/lib/api-upload";
import type {
  CartLine,
  CartOrder,
  CartOrderStatus,
  NewCartLine,
  OrderFulfillment,
} from "@/lib/cart";
import type { PromoEffect } from "./offers-store";

/** Pedidos reais (backend/app/Http/Controllers/Api/V1/OrderController.php)
 * — só usado quando `hasRealBackend`. Status do backend é
 * inglês/snake_case (`pending`/`accepted`/`on_the_way`/`ready`/
 * `delivered`/`completed`/`rejected`/`canceled`); o frontend usa
 * camelCase (`onTheWay`) — as duas funções abaixo fazem a tradução. */

const STATUS_FROM_API: Record<string, CartOrderStatus> = {
  pending: "pending",
  accepted: "accepted",
  on_the_way: "onTheWay",
  delivered: "delivered",
  ready: "ready",
  completed: "completed",
  rejected: "rejected",
  canceled: "canceled",
};

const STATUS_TO_API: Partial<Record<CartOrderStatus, string>> = {
  ready: "ready",
  completed: "completed",
  delivered: "delivered",
  rejected: "rejected",
};

type ApiOrder = {
  id: string;
  restaurantId?: string;
  restaurantName?: string;
  restaurantImage?: string | null;
  fulfillmentType: "delivery" | "takeaway" | "dinein";
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  deliveryAddress: {
    label?: string;
    line1: string;
    line2?: string;
    lat?: number;
    lng?: number;
  } | null;
  pickupAsap: boolean | null;
  pickupAt: string | null;
  partySize: number | null;
  status: string;
  estimatedMinutes: number;
  deliveredAt: string | null;
  paymentMethod: string | null;
  /** Conta/número para onde pagar o método já exigido neste pedido — nunca
   * a lista completa de contas do restaurante (ver OrderResource.php). */
  paymentDestination?: string | null;
  cautionRequired: number | null;
  note: string | null;
  promoCode: string | null;
  promoLabel: string | null;
  promoPercentOff: number | null;
  promoFreeDelivery: boolean;
  paymentProofUrl: string | null;
  paymentProofAt: string | null;
  invoiceUrl: string | null;
  invoiceType: "normal" | "nif" | null;
  invoiceAt: string | null;
  wantsNifInvoice?: boolean;
  invoiceCompany?: { name: string; nif: string; email: string } | null;
  courier?: { name: string; phone: string; vehicle: string } | null;
  subtotal: number;
  deliveryFee: number;
  reservationCredit?: number | null;
  total: number;
  lines: { menuItemId: string; qty: number; ingredients: unknown[] }[];
  createdAt: string;
  guestToken?: string;
};

function mapApiOrder(o: ApiOrder, ownerKey: string): CartOrder {
  const lines: CartLine[] = o.lines.map((l) => ({
    key: `${l.menuItemId}|`,
    menuItemId: l.menuItemId,
    qty: l.qty,
    selectedIngredients: [],
  }));
  return {
    id: o.id,
    restaurantId: o.restaurantId ?? "",
    ownerKey,
    ...(o.restaurantName ? { restaurantName: o.restaurantName } : {}),
    ...(o.restaurantImage ? { restaurantImage: o.restaurantImage } : {}),
    subtotal: o.subtotal,
    deliveryFee: o.deliveryFee,
    ...(o.reservationCredit != null ? { reservationCredit: o.reservationCredit } : {}),
    total: o.total,
    lines,
    createdAt: o.createdAt,
    fulfillmentType: o.fulfillmentType,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    ...(o.customerEmail ? { customerEmail: o.customerEmail } : {}),
    ...(o.deliveryAddress
      ? {
          deliveryAddress: {
            id: "",
            label: o.deliveryAddress.label ?? "",
            line1: o.deliveryAddress.line1,
            line2: o.deliveryAddress.line2 ?? "",
            ...(o.deliveryAddress.lat != null ? { lat: o.deliveryAddress.lat } : {}),
            ...(o.deliveryAddress.lng != null ? { lng: o.deliveryAddress.lng } : {}),
          },
        }
      : {}),
    ...(o.pickupAsap != null ? { pickupAsap: o.pickupAsap } : {}),
    ...(o.pickupAt ? { pickupAt: o.pickupAt } : {}),
    ...(o.partySize != null ? { partySize: o.partySize } : {}),
    status: STATUS_FROM_API[o.status] ?? "pending",
    estimatedMinutes: o.estimatedMinutes,
    ...(o.deliveredAt ? { deliveredAt: o.deliveredAt } : {}),
    ...(o.paymentMethod ? { paymentMethod: o.paymentMethod } : {}),
    ...(o.paymentDestination ? { paymentDestination: o.paymentDestination } : {}),
    ...(o.cautionRequired != null ? { cautionRequired: o.cautionRequired } : {}),
    ...(o.note ? { note: o.note } : {}),
    ...(o.promoCode ? { promoCode: o.promoCode } : {}),
    ...(o.promoLabel ? { promoLabel: o.promoLabel } : {}),
    ...(o.promoPercentOff != null ? { promoPercentOff: o.promoPercentOff } : {}),
    ...(o.promoFreeDelivery ? { promoFreeDelivery: true } : {}),
    ...(o.paymentProofUrl ? { paymentProof: o.paymentProofUrl } : {}),
    ...(o.paymentProofAt ? { paymentProofAt: o.paymentProofAt } : {}),
    ...(o.invoiceUrl ? { invoice: o.invoiceUrl } : {}),
    ...(o.invoiceType ? { invoiceType: o.invoiceType } : {}),
    ...(o.invoiceAt ? { invoiceAt: o.invoiceAt } : {}),
    ...(o.wantsNifInvoice ? { wantsNifInvoice: true } : {}),
    ...(o.invoiceCompany ? { invoiceCompany: o.invoiceCompany } : {}),
    ...(o.courier ? { courier: o.courier } : {}),
  };
}

export async function fetchMyApiOrders(token: string, ownerKey: string): Promise<CartOrder[]> {
  const { data } = await apiFetch<{ data: ApiOrder[] }>("/orders", { token });
  return data.map((o) => mapApiOrder(o, ownerKey));
}

export async function fetchApiOrdersForRestaurant(
  restaurantId: string,
  token: string,
): Promise<CartOrder[]> {
  const { data } = await apiFetch<{ data: ApiOrder[] }>(`/restaurants/${restaurantId}/orders`, {
    token,
  });
  return data.map((o) => mapApiOrder({ ...o, restaurantId }, ""));
}

export async function createApiOrder(
  restaurantId: string,
  items: NewCartLine[],
  fulfillment: OrderFulfillment,
  note: string | undefined,
  promo: PromoEffect | null | undefined,
  extra: { customerName?: string; customerPhone?: string; customerEmail?: string },
  token: string | null,
  invoice?: { wantsNifInvoice: boolean; companyId?: string },
  reservationId?: string,
): Promise<CartOrder> {
  const body: Record<string, unknown> = {
    fulfillment_type: fulfillment.type,
    items: items.map((i) => ({
      menu_item_id: i.menuItemId,
      qty: i.qty,
      ...(i.selectedIngredients?.length
        ? {
            selected_ingredients: i.selectedIngredients.map((s) => ({
              ingredient_id: Number(s.id),
              included: s.included,
            })),
          }
        : {}),
    })),
    ...(note ? { note } : {}),
    ...(promo ? { promo_code: promo.code } : {}),
    ...(extra.customerName ? { customer_name: extra.customerName } : {}),
    ...(extra.customerPhone ? { customer_phone: extra.customerPhone } : {}),
    ...(extra.customerEmail ? { customer_email: extra.customerEmail } : {}),
    ...(invoice?.wantsNifInvoice ? { wants_nif_invoice: true, company_id: invoice.companyId } : {}),
    ...(reservationId ? { reservation_id: reservationId } : {}),
  };
  if (fulfillment.type === "delivery") {
    body["delivery_address"] = {
      label: fulfillment.deliveryAddress.label,
      line1: fulfillment.deliveryAddress.line1,
      line2: fulfillment.deliveryAddress.line2,
      ...(fulfillment.deliveryAddress.lat != null ? { lat: fulfillment.deliveryAddress.lat } : {}),
      ...(fulfillment.deliveryAddress.lng != null ? { lng: fulfillment.deliveryAddress.lng } : {}),
    };
  } else if (fulfillment.type === "takeaway") {
    body["pickup_asap"] = fulfillment.pickupAsap;
    if (fulfillment.pickupAt) body["pickup_at"] = fulfillment.pickupAt;
  } else {
    body["party_size"] = fulfillment.partySize;
  }

  const { data } = await apiFetch<{ data: ApiOrder }>(`/restaurants/${restaurantId}/orders`, {
    method: "POST",
    ...(token ? { token } : {}),
    body,
    headers: { "Idempotency-Key": crypto.randomUUID() },
  });
  return mapApiOrder({ ...data, restaurantId }, "");
}

export async function cancelApiOrder(id: string, token: string | null): Promise<void> {
  await apiFetch(`/orders/${id}/cancel`, { method: "POST", ...(token ? { token } : {}) });
}

export async function acceptApiOrder(
  id: string,
  paymentMethodCode: string,
  token: string,
): Promise<void> {
  await apiFetch(`/orders/${id}/accept`, {
    method: "PATCH",
    token,
    body: { payment_method_code: paymentMethodCode },
  });
}

export async function dispatchApiOrder(
  id: string,
  courierId: string,
  token: string,
): Promise<void> {
  await apiFetch(`/orders/${id}/dispatch`, {
    method: "PATCH",
    token,
    body: { courier_id: courierId },
  });
}

export async function updateApiOrderStatus(
  id: string,
  status: CartOrderStatus,
  token: string,
): Promise<void> {
  const apiStatus = STATUS_TO_API[status];
  if (!apiStatus) return;
  await apiFetch(`/orders/${id}/status`, {
    method: "PATCH",
    token,
    body: { status: apiStatus },
  });
}

/** Comprovativo de pagamento anexado pelo cliente — imagem OU PDF (bancos/
 * carteiras digitais muitas vezes geram o comprovativo como PDF, não
 * imagem), daí `dataUrlToFile` receber a extensão certa em vez de assumir
 * sempre `.jpg` (o `type` do Blob já ficava certo antes disto — só o nome
 * do ficheiro estava errado). */
export async function storeApiPaymentProof(
  id: string,
  dataUrl: string,
  token: string | null,
): Promise<void> {
  const mime = dataUrl.match(/^data:([^;]+);base64/)?.[1] ?? "image/jpeg";
  const ext = mime === "application/pdf" ? "pdf" : (mime.split("/")[1] ?? "jpg");
  const body = new FormData();
  body.append("proof", dataUrlToFile(dataUrl, `proof.${ext}`));
  await apiFetch(`/orders/${id}/payment-proof`, {
    method: "POST",
    ...(token ? { token } : {}),
    body,
  });
}

/** Fatura emitida pelo restaurante (`/admin/pedidos`) — imagem ou PDF. */
export async function storeApiInvoice(
  id: string,
  dataUrl: string,
  token: string,
  type?: "normal" | "nif",
): Promise<CartOrder> {
  const mime = dataUrl.match(/^data:([^;]+);base64/)?.[1] ?? "image/jpeg";
  const ext = mime === "application/pdf" ? "pdf" : (mime.split("/")[1] ?? "jpg");
  const body = new FormData();
  body.append("invoice", dataUrlToFile(dataUrl, `invoice.${ext}`));
  if (type) body.append("type", type);
  const { data } = await apiFetch<{ data: ApiOrder }>(`/orders/${id}/invoice`, {
    method: "POST",
    token,
    body,
  });
  return mapApiOrder(data, "");
}
