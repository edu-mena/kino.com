import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";

const VAPID_PUBLIC_KEY = (import.meta.env["VITE_VAPID_PUBLIC_KEY"] as string | undefined)?.trim();

/** "Já subscrito" na app nativa não dá para perguntar ao SO (ao contrário
 * da Web Push, que devolve a subscrição guardada) — o token só chega uma
 * vez, no callback de `register()`. Guardado aqui só para a UI (o toggle
 * em `/perfil`) lembrar o último estado entre sessões; o backend é sempre
 * a fonte de verdade sobre o token em si. */
const NATIVE_SUBSCRIBED_KEY = "luku_push_native_subscribed";

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

/** Capacitor devolve 4 estados possíveis (`granted`/`denied`/`prompt`/
 * `prompt-with-rationale`) — normalizado para o mesmo trio da Web
 * Notification API, já que é o que a UI em `/perfil` já sabe interpretar. */
function normalizeNativePermission(state: string): NotificationPermission {
  if (state === "granted") return "granted";
  if (state === "denied") return "denied";
  return "default";
}

async function isNativePlatform(): Promise<boolean> {
  const { Capacitor } = await import("@capacitor/core");

  return Capacitor.isNativePlatform();
}

/**
 * Estado + ações da subscrição de push do utilizador atual — Web Push no
 * browser, FCM/APNs (via `@capacitor/push-notifications`) na app nativa.
 * `token` é o token Sanctum de quem está autenticado — cliente (`useAuth`)
 * ou o painel do restaurante (`useRestaurantAdmin`); os dois acabam no
 * mesmo endpoint (`/device-tokens`), a subscrição é sempre por `User` (ver
 * `DeviceTokenController`, backend).
 */
export function usePushSubscription(token: string | null) {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    "unsupported",
  );
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [native, setNative] = useState(false);

  const webSupported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    !!VAPID_PUBLIC_KEY;

  const supported = native || webSupported;

  // Estado inicial — o que já está no dispositivo, não o que a Luku pensa
  // que está (a permissão pode ter sido revogada nas definições do
  // sistema/browser sem a app saber, e uma subscrição web sobrevive a um
  // reload; na app nativa não há como perguntar ao SO, só ao que ficou
  // guardado localmente da última vez — ver NATIVE_SUBSCRIBED_KEY).
  useEffect(() => {
    isNativePlatform().then(async (isNative) => {
      setNative(isNative);
      if (isNative) {
        const { PushNotifications } = await import("@capacitor/push-notifications");
        const status = await PushNotifications.checkPermissions();
        setPermission(normalizeNativePermission(status.receive));
        setSubscribed(
          status.receive === "granted" && localStorage.getItem(NATIVE_SUBSCRIBED_KEY) === "1",
        );
        return;
      }
      if (!webSupported) return;
      setPermission(Notification.permission);
      navigator.serviceWorker.ready
        .then((registration) => registration.pushManager.getSubscription())
        .then((sub) => setSubscribed(!!sub))
        .catch(() => setSubscribed(false));
    });
  }, [webSupported]);

  const subscribeNative = useCallback(async (): Promise<NotificationPermission | "unsupported"> => {
    const { Capacitor } = await import("@capacitor/core");
    const { PushNotifications } = await import("@capacitor/push-notifications");

    const status = await PushNotifications.requestPermissions();
    const result = normalizeNativePermission(status.receive);
    setPermission(result);
    if (result !== "granted") return result;

    // O token só chega pelo listener, de forma assíncrona — nunca como
    // valor de retorno de `register()` (ver definitions.d.ts do plugin).
    const registered = await new Promise<boolean>((resolve) => {
      let settled = false;
      PushNotifications.addListener("registration", (tokenResult) => {
        if (settled) return;
        settled = true;
        void apiFetch("/device-tokens", {
          method: "POST",
          token,
          body: { platform: Capacitor.getPlatform(), token: tokenResult.value },
        })
          .then(() => resolve(true))
          .catch(() => resolve(false));
      });
      PushNotifications.addListener("registrationError", () => {
        if (settled) return;
        settled = true;
        resolve(false);
      });
      void PushNotifications.register();
    });

    if (registered) {
      localStorage.setItem(NATIVE_SUBSCRIBED_KEY, "1");
      setSubscribed(true);
    }

    return result;
  }, [token]);

  const unsubscribeNative = useCallback(async () => {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    await PushNotifications.unregister();
    localStorage.removeItem(NATIVE_SUBSCRIBED_KEY);
    setSubscribed(false);
  }, []);

  /** @returns a permissão resultante — o chamador usa isto (não o estado do
   * hook, que só atualiza no próximo render) para saber logo se ficou
   * negada, sem esperar por um novo render. */
  const subscribe = useCallback(async (): Promise<NotificationPermission | "unsupported"> => {
    if (!supported || !token) return "unsupported";
    if (native) return subscribeNative();

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
  }, [supported, native, subscribeNative, token]);

  const unsubscribe = useCallback(async () => {
    if (!supported || !token) return;
    if (native) {
      setBusy(true);
      try {
        await unsubscribeNative();
      } finally {
        setBusy(false);
      }
      return;
    }

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
  }, [supported, native, unsubscribeNative, token]);

  return { supported, permission, subscribed, busy, subscribe, unsubscribe };
}
