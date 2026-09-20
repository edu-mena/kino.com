import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";

const VAPID_PUBLIC_KEY = (import.meta.env["VITE_VAPID_PUBLIC_KEY"] as string | undefined)?.trim();

/** O Push API pede a chave pública como `Uint8Array`, não a string
 * base64url que o servidor guarda/expõe — conversão padrão, sempre igual
 * nos exemplos de Web Push. */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

/** Regista o service worker do Web Push — chamado uma vez no arranque da
 * app (ver __root.tsx), independente de sessão nenhuma. No-op fora da web
 * (a app nativa não usa Web Push — ver capacitor/README.md) ou em
 * browsers sem suporte (ex.: `webkit` mais antigo). */
export function registerPushServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

  navigator.serviceWorker.register("/sw.js").catch(() => {
    // Falha ao registar — `usePushSubscription` continua a reportar
    // `supported: false` (não há `serviceWorker.ready` para resolver),
    // o botão de ativar simplesmente não aparece. Sem consequência para
    // o resto da app.
  });
}

/**
 * Estado + ações da subscrição Web Push do utilizador atual. `token` é o
 * token Sanctum de quem está autenticado — cliente (`useAuth`) ou o painel
 * do restaurante (`useRestaurantAdmin`); os dois acabam no mesmo endpoint
 * (`/device-tokens`), a subscrição é sempre por `User` (ver
 * `DeviceTokenController`, backend).
 */
export function usePushSubscription(token: string | null) {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    "unsupported",
  );
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    !!VAPID_PUBLIC_KEY;

  // Estado inicial — o que já está no browser, não o que a Luku pensa que
  // está (a permissão pode ter sido revogada nas definições do browser sem
  // a app saber, e uma subscrição sobrevive a um reload).
  useEffect(() => {
    if (!supported) return;
    setPermission(Notification.permission);
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => setSubscribed(false));
  }, [supported]);

  /** @returns a permissão resultante — o chamador usa isto (não o estado do
   * hook, que só atualiza no próximo render) para saber logo se ficou
   * negada, sem esperar por um novo render. */
  const subscribe = useCallback(async (): Promise<NotificationPermission | "unsupported"> => {
    if (!supported || !token) return "unsupported";
    setBusy(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") return result;

      const registration = await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY as string),
        }));

      await apiFetch("/device-tokens", {
        method: "POST",
        token,
        body: { platform: "web", subscription: subscription.toJSON() },
      });
      setSubscribed(true);

      return result;
    } finally {
      setBusy(false);
    }
  }, [supported, token]);

  const unsubscribe = useCallback(async () => {
    if (!supported || !token) return;
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await apiFetch("/device-tokens", {
          method: "DELETE",
          token,
          body: { platform: "web", subscription: subscription.toJSON() },
        });
        await subscription.unsubscribe();
      }
      setSubscribed(false);
    } finally {
      setBusy(false);
    }
  }, [supported, token]);

  return { supported, permission, subscribed, busy, subscribe, unsubscribe };
}
