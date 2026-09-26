import Echo from "laravel-echo";
import Pusher from "pusher-js";
import { API_BASE_URL, hasRealBackend } from "@/lib/api-client";

/**
 * Cliente Reverb (Fase N3) — substitui o poll de 30s por transmissão real:
 * `NotificationCreated` (backend, ver `app/Events`) chega aqui assim que a
 * notificação é criada, sem esperar o próximo ciclo de poll. `pusher-js`
 * precisa de estar acessível ao `laravel-echo` — window global, convenção da
 * própria lib (ver capacitor/README.md para o resto da configuração).
 */
declare global {
  interface Window {
    Pusher: typeof Pusher;
  }
}

/** Disparado no `window` sempre que uma notificação chega em tempo real —
 * `cart.tsx`/`reservations.tsx` ouvem isto para se atualizarem de imediato
 * (mesma ideia do evento `storage` já usado para sincronizar abas, só que
 * entre o servidor e a app, não entre abas). */
export const REALTIME_NOTIFICATION_EVENT = "luku:realtime-notification";

export type RealtimeNotificationPayload = {
  id: string;
  kind: "order" | "reservation" | "restaurant";
  refId: string | null;
  restaurantId: string | null;
  event: string;
  status: string;
  snapshot: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
};

let echo: Echo<"reverb"> | null = null;
let echoToken: string | null = null;

function getEcho(token: string): Echo<"reverb"> | null {
  if (!hasRealBackend || typeof window === "undefined") return null;
  if (echo && echoToken === token) return echo;
  if (echo) echo.disconnect();

  echoToken = token;
  window.Pusher = Pusher;
  echo = new Echo<"reverb">({
    broadcaster: "reverb",
    key: import.meta.env["VITE_REVERB_APP_KEY"] as string,
    wsHost: import.meta.env["VITE_REVERB_HOST"] as string,
    wsPort: Number(import.meta.env["VITE_REVERB_PORT"] ?? 80),
    wssPort: Number(import.meta.env["VITE_REVERB_PORT"] ?? 443),
    forceTLS: (import.meta.env["VITE_REVERB_SCHEME"] as string) === "https",
    enabledTransports: ["ws", "wss"],
    authEndpoint: `${API_BASE_URL}/broadcasting/auth`,
    bearerToken: token,
  });
  return echo;
}

/** Fecha a ligação — chamado no logout (cliente ou painel), para nunca
 * continuar ligado ao canal de uma sessão que já terminou. */
export function disconnectEcho(): void {
  if (!echo) return;
  echo.disconnect();
  echo = null;
  echoToken = null;
}

/** Ouve o canal privado de um utilizador (cliente) OU de um restaurante
 * (painel) — nunca os dois na mesma chamada (ver `NotificationCreated`,
 * cada notificação pertence só a um). Devolve a função de limpeza
 * (unsubscribe) para o `useEffect` chamador. */
export function subscribeToNotifications(
  token: string,
  channel: { type: "user" | "restaurant"; id: string },
  onEvent: (payload: RealtimeNotificationPayload) => void,
): () => void {
  const client = getEcho(token);
  if (!client) return () => {};

  const channelName =
    channel.type === "user"
      ? `App.Models.User.${channel.id}`
      : `App.Models.Restaurant.${channel.id}`;

  // `.notification.created` com ponto inicial — nome de evento próprio
  // (`broadcastAs()` no backend), não o nome de classe totalmente
  // qualificado que o Echo assumiria por omissão.
  client.private(channelName).listen(".notification.created", onEvent);

  return () => {
    client.leaveChannel(`private-${channelName}`);
  };
}
