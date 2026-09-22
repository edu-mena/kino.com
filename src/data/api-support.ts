import { apiFetch } from "@/lib/api-client";
import type { SupportTicket } from "./support-tickets-store";

/** CRUD real de tickets de suporte
 * (backend/app/Http/Controllers/Api/V1/SupportTicketController.php) — só
 * usado quando `hasRealBackend`. Ao criar, o backend já envia um email real
 * para a equipa Luku (SupportTicketMail) — substitui o `mailto:` de antes,
 * que abria o cliente de email do próprio restaurante para um endereço
 * errado, sem garantia nenhuma de a mensagem chegar. */

type ApiSupportTicket = {
  id: string;
  restaurantId?: string | null;
  restaurantName?: string | null;
  subject: string;
  message: string;
  status: "open" | "resolved";
  createdAt: string;
};

function mapApiSupportTicket(t: ApiSupportTicket): SupportTicket {
  return {
    id: t.id,
    restaurantId: t.restaurantId ?? "",
    restaurantName: t.restaurantName ?? "",
    subject: t.subject,
    message: t.message,
    status: t.status,
    createdAt: t.createdAt,
  };
}

/** Sem `restaurantId`: todos os tickets, de todos os restaurantes — só
 * `system_operator` (ver `/sistema/suporte`). Com `restaurantId`: só os
 * desse restaurante (ver `/admin/suporte`). */
export async function fetchApiSupportTickets(
  restaurantId: string | undefined,
  token: string,
): Promise<SupportTicket[]> {
  const path = restaurantId ? `/restaurants/${restaurantId}/support-tickets` : "/support-tickets";
  const { data } = await apiFetch<{ data: ApiSupportTicket[] }>(path, { token });
  return data.map(mapApiSupportTicket);
}

export async function createApiSupportTicket(
  restaurantId: string,
  input: { subject: string; message: string },
  token: string,
): Promise<SupportTicket> {
  const { data } = await apiFetch<{ data: ApiSupportTicket }>(
    `/restaurants/${restaurantId}/support-tickets`,
    { method: "POST", token, body: input },
  );
  return mapApiSupportTicket(data);
}

/** Só `system_operator` — ver SupportTicketController::updateStatus. */
export async function updateApiSupportTicketStatus(
  id: string,
  status: "open" | "resolved",
  token: string,
): Promise<SupportTicket> {
  const { data } = await apiFetch<{ data: ApiSupportTicket }>(`/support-tickets/${id}/status`, {
    method: "PATCH",
    token,
    body: { status },
  });
  return mapApiSupportTicket(data);
}
