import { apiFetch } from "@/lib/api-client";
import type { LukuNotification, NotificationSnapshot } from "@/lib/notifications";

/** Notificações reais (backend/app/Http/Controllers/Api/V1/NotificationController.php)
 * — só usado quando `hasRealBackend`. `GET /notifications` já vem
 * filtrado ao próprio utilizador pelo backend; `GET
 * /restaurants/{id}/notifications` ao próprio restaurante — nenhum dos
 * dois aceita ver notificações de outra conta/restaurante. */
type ApiNotification = {
  id: string;
  kind: "order" | "reservation" | "restaurant";
  refId: string | null;
  restaurantId: string | null;
  event: string;
  status: string;
  snapshot: NotificationSnapshot | null;
  readAt: string | null;
  createdAt: string;
};

function mapApiNotification(n: ApiNotification, ownerKey?: string): LukuNotification {
  return {
    id: n.id,
    kind: n.kind,
    refId: n.refId ?? "",
    restaurantId: n.restaurantId ?? "",
    event: n.event,
    status: n.status,
    ...(n.snapshot ? { snapshot: n.snapshot } : {}),
    ...(ownerKey ? { ownerKey } : {}),
    at: n.createdAt,
    read: n.readAt != null,
  };
}

/** `ownerKey` é só para etiquetar o resultado, para `scopeNotifications`
 * (client-side, partilhado com o mock) continuar a funcionar sem alteração
 * — o filtro a sério já aconteceu no backend. */
export async function fetchApiNotifications(
  token: string,
  ownerKey: string,
): Promise<LukuNotification[]> {
  const { data } = await apiFetch<{ data: ApiNotification[] }>("/notifications?per_page=50", {
    token,
  });
  return data.map((n) => mapApiNotification(n, ownerKey));
}

export async function fetchApiRestaurantNotifications(
  restaurantId: string,
  token: string,
): Promise<LukuNotification[]> {
  const { data } = await apiFetch<{ data: ApiNotification[] }>(
    `/restaurants/${restaurantId}/notifications?per_page=50`,
    { token },
  );
  return data.map((n) => mapApiNotification(n));
}

export async function markApiNotificationRead(id: string, token: string): Promise<void> {
  await apiFetch(`/notifications/${id}/read`, { method: "PATCH", token });
}

/** `restaurantId` presente = lote do painel do restaurante (o backend exige
 * isso para autorizar/filtrar o `whereIn` só às dele); ausente = lote do
 * próprio cliente. */
export async function markManyApiNotificationsRead(
  ids: string[],
  token: string,
  restaurantId?: string,
): Promise<void> {
  await apiFetch("/notifications/read", {
    method: "POST",
    token,
    body: { ids, ...(restaurantId ? { restaurant_id: restaurantId } : {}) },
  });
}
