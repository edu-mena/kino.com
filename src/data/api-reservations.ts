import { apiFetch } from "@/lib/api-client";
import { dataUrlToFile } from "@/lib/api-upload";
import type { Reservation } from "./types";

/** Reservas reais (backend/app/Http/Controllers/Api/V1/ReservationController.php)
 * — só usado quando `hasRealBackend`. Status do backend é inglês/minúsculas
 * (`pending`/`confirmed`/`declined`/`voided`/`canceled`); o frontend usa
 * strings em português (ver tipo `Reservation.status`) — as duas funções
 * abaixo fazem a tradução nos dois sentidos. */

const STATUS_FROM_API: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmada",
  declined: "Recusada",
  voided: "Anulada",
  canceled: "Cancelada",
  no_show: "Não compareceu",
};

const STATUS_TO_API: Record<string, string> = {
  Pendente: "pending",
  Confirmada: "confirmed",
  Recusada: "declined",
  Anulada: "voided",
  "Não compareceu": "no_show",
};

/** `caution_status` do backend real (`pending`/`paid`/`not_required`/
 * `refunded`) traduzido aqui, na origem — mesmo padrão do `status`
 * principal acima. Sem isto, comparações como
 * `cautionStatus.startsWith("Paga")` (`admin.reservas.tsx`, KPI de
 * depósitos cobrados) só funcionavam com o mock (que já usa strings em
 * português, ex. "Paga (Garantia)") e ficavam sempre falsas com o backend
 * real — e o valor cru em inglês chegava a ser mostrado ao cliente sem
 * tradução nenhuma. */
const CAUTION_STATUS_FROM_API: Record<string, string> = {
  pending: "Pendente",
  paid: "Paga",
  not_required: "Sem caução",
  refunded: "Reembolsada",
};

type ApiReservation = {
  id: string;
  restaurantId?: string;
  restaurantName?: string;
  restaurantImage?: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  date: string;
  time: string;
  peopleCount: number;
  cautionAmount: number;
  cautionStatus: string;
  status: string;
  statusUpdatedAt: string | null;
  tableId?: string | null;
  specialRequests: string | null;
  paymentProofUrl?: string | null;
  paymentProofAt?: string | null;
  invoiceUrl?: string | null;
  invoiceAt?: string | null;
  promoCode?: string | null;
  promoLabel?: string | null;
  promoPercentOff?: number | null;
  reservationKind?: string;
  package?: { id: string; title: string | null; packageTypeName: string; price: number } | null;
  createdAt: string;
};

function mapApiReservation(r: ApiReservation, ownerKey: string): Reservation {
  return {
    id: r.id,
    restaurantId: r.restaurantId ?? "",
    ownerKey,
    restaurantName: r.restaurantName ?? "",
    restaurantImage: r.restaurantImage ?? "",
    customerName: r.customerName,
    customerPhone: r.customerPhone,
    customerEmail: r.customerEmail ?? "",
    date: r.date,
    time: r.time,
    peopleCount: r.peopleCount,
    cautionAmount: r.cautionAmount,
    cautionStatus: CAUTION_STATUS_FROM_API[r.cautionStatus] ?? r.cautionStatus,
    status: STATUS_FROM_API[r.status] ?? r.status,
    ...(r.statusUpdatedAt ? { statusUpdatedAt: r.statusUpdatedAt } : {}),
    ...(r.tableId ? { tableId: r.tableId } : {}),
    ...(r.specialRequests ? { specialRequests: r.specialRequests } : {}),
    ...(r.paymentProofUrl ? { paymentProof: r.paymentProofUrl } : {}),
    ...(r.paymentProofAt ? { paymentProofAt: r.paymentProofAt } : {}),
    ...(r.invoiceUrl ? { invoice: r.invoiceUrl } : {}),
    ...(r.invoiceAt ? { invoiceAt: r.invoiceAt } : {}),
    ...(r.promoCode ? { promoCode: r.promoCode } : {}),
    ...(r.promoLabel ? { promoLabel: r.promoLabel } : {}),
    ...(r.promoPercentOff != null ? { promoPercentOff: r.promoPercentOff } : {}),
    ...(r.reservationKind === "package" ? { reservationKind: "package" as const } : {}),
    ...(r.package
      ? {
          package: {
            id: r.package.id,
            ...(r.package.title ? { title: r.package.title } : {}),
            packageTypeName: r.package.packageTypeName,
            price: r.package.price,
          },
        }
      : {}),
    createdAt: r.createdAt,
  };
}

/** "Minhas reservas" do cliente autenticado, em qualquer restaurante —
 * `ownerKey` vem já resolvido pelo caller (viewerKey do user autenticado),
 * já que a API só devolve reservas que já são mesmo dele. */
export async function fetchMyApiReservations(
  token: string,
  ownerKey: string,
): Promise<Reservation[]> {
  const { data } = await apiFetch<{ data: ApiReservation[] }>("/reservations", { token });
  return data.map((r) => mapApiReservation(r, ownerKey));
}

/** Reservas de UM restaurante — painel `/admin/reservas` (staff). */
export async function fetchApiReservationsForRestaurant(
  restaurantId: string,
  token: string,
): Promise<Reservation[]> {
  const { data } = await apiFetch<{ data: ApiReservation[] }>(
    `/restaurants/${restaurantId}/reservations`,
    { token },
  );
  return data.map((r) => mapApiReservation({ ...r, restaurantId }, ""));
}

export async function createApiReservation(
  restaurantId: string,
  input: {
    date: string;
    time: string;
    peopleCount: number;
    specialRequests?: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    /** Só aplicável quando a promoção não tem prato/categoria alvo e não é
     * "entrega grátis" — o backend ignora silenciosamente caso contrário
     * (ver ReservationController::store). */
    promoCode?: string;
    /** Reserva de um pacote (Fase L3c) — `id` de `RestaurantPackage`, do
     * MESMO restaurante e ativo (o backend rejeita caso contrário). A
     * caução passa a ser o preço do pacote, não o valor genérico do
     * restaurante. */
    packageId?: string;
  },
  token: string | null,
): Promise<Reservation> {
  const { data } = await apiFetch<{ data: ApiReservation }>(
    `/restaurants/${restaurantId}/reservations`,
    {
      method: "POST",
      ...(token ? { token } : {}),
      body: {
        date: input.date,
        time: input.time,
        people_count: input.peopleCount,
        ...(input.specialRequests ? { special_requests: input.specialRequests } : {}),
        ...(input.customerName ? { customer_name: input.customerName } : {}),
        ...(input.customerPhone ? { customer_phone: input.customerPhone } : {}),
        ...(input.customerEmail ? { customer_email: input.customerEmail } : {}),
        ...(input.promoCode ? { promo_code: input.promoCode } : {}),
        ...(input.packageId ? { package_id: input.packageId } : {}),
      },
      headers: { "Idempotency-Key": crypto.randomUUID() },
    },
  );
  return mapApiReservation({ ...data, restaurantId }, "");
}

/** Staff confirma o pagamento da caução — só então `cautionStatus` chega a
 * "Paga" (nunca sozinho ao carregar o comprovativo, ver
 * `storeApiReservationPaymentProof`). Sem isto, uma reserva nunca fica
 * elegível para o desconto automático num pedido dine-in (Fase J3). */
export async function confirmApiReservationCaution(id: string, token: string): Promise<void> {
  await apiFetch(`/reservations/${id}/caution`, { method: "PATCH", token });
}

export async function updateApiReservationStatus(
  id: string,
  status: string,
  token: string,
): Promise<void> {
  const apiStatus = STATUS_TO_API[status];
  if (!apiStatus) return;
  await apiFetch(`/reservations/${id}/status`, {
    method: "PATCH",
    token,
    body: { status: apiStatus },
  });
}

export async function assignApiReservationTable(
  id: string,
  tableId: string | undefined,
  token: string,
): Promise<void> {
  await apiFetch(`/reservations/${id}/table`, {
    method: "PATCH",
    token,
    body: { table_id: tableId ?? null },
  });
}

/** Cliente/convidado cancela a própria reserva (`ReservationController::cancel`)
 * — só enquanto "Pendente". Distinto de `updateApiReservationStatus`: esse é
 * staff-only (exige `manageOperations`) e nem tem "Cancelada" mapeada. */
export async function cancelApiReservation(id: string, token: string | null): Promise<void> {
  await apiFetch(`/reservations/${id}/cancel`, {
    method: "POST",
    ...(token ? { token } : {}),
  });
}

/** Comprovativo de pagamento da caução — imagem OU PDF (bancos/carteiras
 * digitais muitas vezes geram o comprovativo como PDF, não imagem), daí
 * `dataUrlToFile` receber a extensão certa em vez de assumir sempre `.jpg`
 * (mesmo padrão já corrigido em `storeApiPaymentProof`, `api-orders.ts`). */
export async function storeApiReservationPaymentProof(
  id: string,
  dataUrl: string,
  token: string | null,
): Promise<void> {
  const mime = dataUrl.match(/^data:([^;]+);base64/)?.[1] ?? "image/jpeg";
  const ext = mime === "application/pdf" ? "pdf" : (mime.split("/")[1] ?? "jpg");
  const body = new FormData();
  body.append("proof", dataUrlToFile(dataUrl, `proof.${ext}`));
  await apiFetch(`/reservations/${id}/payment-proof`, {
    method: "POST",
    ...(token ? { token } : {}),
    body,
  });
}

/** Fatura da reserva, emitida pelo restaurante (staff-only) — imagem ou
 * PDF, mesmo cálculo de extensão de `storeApiReservationPaymentProof`. Ao
 * contrário da fatura de pedidos, não tem `type` (normal/NIF): a reserva
 * não tem esse conceito, é só o comprovativo final de consumo/caução. */
export async function storeApiReservationInvoice(
  id: string,
  dataUrl: string,
  token: string,
): Promise<void> {
  const mime = dataUrl.match(/^data:([^;]+);base64/)?.[1] ?? "image/jpeg";
  const ext = mime === "application/pdf" ? "pdf" : (mime.split("/")[1] ?? "jpg");
  const body = new FormData();
  body.append("invoice", dataUrlToFile(dataUrl, `invoice.${ext}`));
  await apiFetch(`/reservations/${id}/invoice`, {
    method: "POST",
    token,
    body,
  });
}
