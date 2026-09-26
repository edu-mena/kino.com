import type EchoType from "laravel-echo";
import type PusherType from "pusher-js";
import { API_BASE_URL, hasRealBackend } from "@/lib/api-client";

/**
 * Cliente Reverb (Fase N3) — substitui o poll de 30s por transmissão real:
 * `NotificationCreated` (backend, ver `app/Events`) chega aqui assim que a
 * notificação é criada, sem esperar o próximo ciclo de poll.
 *
 * `laravel-echo`/`pusher-js` só são importados (via `import()` dinâmico), e
 * só chamados dentro de um `useEffect` (nunca durante SSR) — importá-los
 * estaticamente aqui rebentava a app inteira: `notifications.tsx` (que
 * importa este ficheiro) faz parte da árvore de providers da raiz,
 * renderizada também no servidor, e o bundle de `pusher-js` toca em
 * `window` incondicionalmente ao carregar — sem `window` no runtime do
 * servidor (edge/Cloudflare Workers), o import falhava e derrubava a
 * renderização de TODA a árvore de providers antes de chegar ao
 * `PreferencesProvider`, daí o erro genérico "usePreferences must be used
 * inside PreferencesProvider" em qualquer página.
 */
declare global {
  interface Window {
    Pusher: typeof PusherType;
  }
}

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

let echo: EchoType<"reverb"> | null = null;
let echoToken: string | null = null;
let loading: Promise<{ Echo: typeof EchoType; Pusher: typeof PusherType }> | null = null;

function loadEchoLibs() {
  loading ??= Promise.all([import("laravel-echo"), import("pusher-js")]).then(
    ([echoMod, pusherMod]) => ({ Echo: echoMod.default, Pusher: pusherMod.default }),
  );
  return loading;
}

async function getEcho(token: string): Promise<EchoType<"reverb"> | null> {
  if (!hasRealBackend || typeof window === "undefined") return null;
  if (echo && echoToken === token) return echo;
  if (echo) echo.disconnect();

  const { Echo, Pusher } = await loadEchoLibs();
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
 * (unsubscribe) para o `useEffect` chamador — a subscrição em si é
 * assíncrona (`import()` dinâmico), por isso a limpeza cancela mesmo que o
 * componente desmonte antes de `getEcho` resolver. */
export function subscribeToNotifications(
  token: string,
  channel: { type: "user" | "restaurant"; id: string },
  onEvent: (payload: RealtimeNotificationPayload) => void,
): () => void {
  let cancelled = false;
  let subscribed: { client: EchoType<"reverb">; channelName: string } | null = null;

  void getEcho(token).then((client) => {
    if (cancelled || !client) return;
    const channelName =
      channel.type === "user"
        ? `App.Models.User.${channel.id}`
        : `App.Models.Restaurant.${channel.id}`;
    client.private(channelName).listen(".notification.created", onEvent);
    subscribed = { client, channelName };
  });

  return () => {
    cancelled = true;
    if (subscribed) subscribed.client.leaveChannel(`private-${subscribed.channelName}`);
  };
}
