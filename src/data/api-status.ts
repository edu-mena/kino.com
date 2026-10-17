import { apiFetch } from "@/lib/api-client";

/** Página de estado (/estado), faixa de incidente e painel /sistema/estado —
 * backend/app/Http/Controllers/Api/V1/StatusController.php. A parte pública
 * nunca traz detalhes técnicos: só serviço, estado e disponibilidade. */

export type StatusComponentKey = "app" | "menus" | "orders" | "accounts" | "notifications";

export type StatusComponent = {
  key: StatusComponentKey;
  status: "operational" | "outage" | "recovering";
  /** Disponibilidade em % nos últimos 90 dias (null = sem dados ainda). */
  uptime: number | null;
  days: { date: string; uptime: number | null }[];
};

export type StatusIncident = {
  id: string;
  status: "investigating" | "monitoring" | "resolved";
  components: StatusComponentKey[];
  startedAt: string;
  resolvedAt: string | null;
  /** Causa pública (só depois de resolvido). */
  cause: string | null;
  message: { title: string; body: string };
};

export type ServiceStatus = {
  status: "operational" | "incident" | "recovering";
  components: StatusComponent[];
  activeIncident: StatusIncident | null;
  incidents: StatusIncident[];
  generatedAt: string;
};

export async function fetchServiceStatus(): Promise<ServiceStatus> {
  const { data } = await apiFetch<{ data: ServiceStatus }>("/status");
  return data;
}

export async function subscribeToStatus(email: string): Promise<void> {
  await apiFetch("/status/subscribe", { method: "POST", body: { email } });
}

export async function confirmStatusSubscription(token: string): Promise<void> {
  await apiFetch("/status/confirm", { method: "POST", body: { token } });
}

export async function cancelStatusSubscription(token: string): Promise<void> {
  await apiFetch("/status/unsubscribe", { method: "POST", body: { token } });
}

// --- Painel de sistema (operadores) -----------------------------------

export type SystemIncident = StatusIncident & {
  internalError: string | null;
  publicCause: string | null;
  defaultCause: string;
  usersNotifiedAt: string | null;
  resolutionNotifiedAt: string | null;
};

export type HealthCheckResult = { ok: boolean; error: string | null; ms: number };

export async function fetchSystemStatus(
  token: string,
): Promise<{ incidents: SystemIncident[]; subscribers: number }> {
  const { data } = await apiFetch<{ data: { incidents: SystemIncident[]; subscribers: number } }>(
    "/system/status",
    { token },
  );
  return data;
}

export async function runSystemHealthChecks(
  token: string,
): Promise<Record<string, HealthCheckResult>> {
  const { data } = await apiFetch<{ data: Record<string, HealthCheckResult> }>(
    "/system/status/check",
    { method: "POST", token },
  );
  return data;
}

export async function updateIncidentCause(
  id: string,
  publicCause: string,
  token: string,
): Promise<void> {
  await apiFetch(`/system/status/incidents/${id}`, {
    method: "PATCH",
    token,
    body: { public_cause: publicCause },
  });
}

export async function resolveIncident(id: string, token: string): Promise<void> {
  await apiFetch(`/system/status/incidents/${id}/resolve`, { method: "POST", token });
}
