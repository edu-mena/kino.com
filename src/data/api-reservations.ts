import { apiFetch } from "@/lib/api-client";
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
};

const STATUS_TO_API: Record<string, string> = {
  Confirmada: "confirmed",
  Recusada: "declined",
  Anulada: "voided",
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
    cautionStatus: r.cautionStatus,
    status: STATUS_FROM_API[r.status] ?? r.status,
    ...(r.statusUpdatedAt ? { statusUpdatedAt: r.statusUpdatedAt } : {}),
    ...(r.tableId ? { tableId: r.tableId } : {}),
    ...(r.specialRequests ? { specialRequests: r.specialRequests } : {}),
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
      },
    },
  );
  return mapApiReservation({ ...data, restaurantId }, "");
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
