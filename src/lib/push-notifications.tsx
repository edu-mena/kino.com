import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";

const VAPID_PUBLIC_KEY = (import.meta.env["VITE_VAPID_PUBLIC_KEY"] as string | undefined)?.trim();

/**
 * Lado da app a quem pertence a subscrição: a conta de cliente ou o painel do
 * restaurante. No mesmo telemóvel/browser podem estar os dois — cada um liga
 * e desliga o seu push, registado na conta certa (`/device-tokens` é sempre
 * por `User`, ver `DeviceTokenController`).
 */
export type PushScope = "client" | "restaurant";

/** "Ativado" por lado — o SO/browser só sabe se o dispositivo tem push, não
 * para que conta. O backend continua a ser a fonte de verdade do token. */
const subscribedKey = (scope: PushScope) => `luku_push_subscribed:${scope}`;
/** Chave antiga (antes da separação por lado) — só existia para o cliente. */
const LEGACY_NATIVE_SUBSCRIBED_KEY = "luku_push_native_subscribed";
/** Último token FCM deste dispositivo — preciso para o apagar no logout. */
const NATIVE_TOKEN_KEY = "luku_push_native_token";

function isScopeSubscribed(scope: PushScope): boolean {
  try {
    if (localStorage.getItem(subscribedKey(scope)) === "1") return true;
    return scope === "client" && localStorage.getItem(LEGACY_NATIVE_SUBSCRIBED_KEY) === "1";
  } catch {
    return false;
  }
}

function setScopeSubscribed(scope: PushScope, on: boolean) {
  try {
    if (on) localStorage.setItem(subscribedKey(scope), "1");
    else localStorage.removeItem(subscribedKey(scope));
    if (scope === "client") localStorage.removeItem(LEGACY_NATIVE_SUBSCRIBED_KEY);
  } catch {
    // armazenamento indisponível — o estado só não sobrevive ao reload
  }
}

const otherScope = (scope: PushScope): PushScope => (scope === "client" ? "restaurant" : "client");

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
 * Notification API, já que é o que a UI já sabe interpretar. */
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
 * Pede ao FCM o token deste dispositivo. O token só chega pelo listener,
 * nunca como retorno de `register()` (ver definitions.d.ts do plugin) — os
 * listeners são removidos logo a seguir (antes acumulavam-se, um par novo a
 * cada ativação).
 */
async function registerNativeDevice(): Promise<string | null> {
  const { PushNotifications } = await import("@capacitor/push-notifications");
  return new Promise<string | null>((resolve) => {
    let settled = false;
    const handles: Promise<{ remove: () => Promise<void> }>[] = [];
    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      for (const h of handles) void h.then((l) => l.remove());
      resolve(value);
    };
    handles.push(PushNotifications.addListener("registration", (t) => finish(t.value)));
    handles.push(PushNotifications.addListener("registrationError", () => finish(null)));
    void PushNotifications.register().catch(() => finish(null));
    // Sem Google Play Services / google-services.json, nenhum dos eventos chega.
    setTimeout(() => finish(null), 15_000);
  });
}

async function sendNativeToken(authToken: string, deviceToken: string): Promise<boolean> {
  const { Capacitor } = await import("@capacitor/core");
  try {
    await apiFetch("/device-tokens", {
      method: "POST",
      token: authToken,
      body: { platform: Capacitor.getPlatform(), token: deviceToken },
    });
    try {
      localStorage.setItem(NATIVE_TOKEN_KEY, deviceToken);
    } catch {
      // sem armazenamento: o logout não conseguirá apagar este token
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Apaga, na conta que está a sair, o registo de push deste dispositivo —
 * chamado no logout (cliente e painel), ANTES de revogar o token de sessão.
 * Sem isto o telemóvel continuava a receber as notificações da conta
 * depois de sair dela. Nunca lança: é sempre um extra ao logout.
 */
export async function forgetPushOnLogout(authToken: string, scope: PushScope): Promise<void> {
  if (typeof window === "undefined" || !isScopeSubscribed(scope)) return;
  setScopeSubscribed(scope, false);
  try {
    if (await isNativePlatform()) {
      const { Capacitor } = await import("@capacitor/core");
      const deviceToken = localStorage.getItem(NATIVE_TOKEN_KEY);
      if (!deviceToken) return;
      await apiFetch("/device-tokens", {
        method: "DELETE",
        token: authToken,
        body: { platform: Capacitor.getPlatform(), token: deviceToken },
      });
      return;
    }
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;
    await apiFetch("/device-tokens", {
      method: "DELETE",
      token: authToken,
      body: { platform: "web", subscription: subscription.toJSON() },
    });
  } catch {
    // best-effort
  }
}

/**
 * Toque numa notificação push recebida com a app nativa em segundo plano ou
 * fechada → abre o ecrã certo (`data.url`, decidido pelo backend — ver
 * `PushNotificationService::urlFor`). Montado uma vez, no `__root`.
 */
export async function listenForNativePushTaps(
  navigateTo: (url: string) => void,
): Promise<() => void> {
  if (!(await isNativePlatform())) return () => {};
  const { PushNotifications } = await import("@capacitor/push-notifications");
  const handle = await PushNotifications.addListener(
    "pushNotificationActionPerformed",
    (action) => {
      const url = (action.notification.data as { url?: unknown } | undefined)?.url;
      if (typeof url === "string" && url.startsWith("/")) navigateTo(url);
    },
  );
  return () => void handle.remove();
}

/**
 * Estado + ações da subscrição de push de um lado da app (`scope`) — Web Push
 * no browser, FCM (via `@capacitor/push-notifications`) na app nativa.
 * `token` é o token Sanctum desse lado: cliente (`getAuthToken`) ou painel
 * do restaurante (`getAdminToken`).
 */
export function usePushSubscription(token: string | null, scope: PushScope = "client") {
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

  // Estado inicial — o que está no dispositivo, cruzado com o que este lado
  // ativou (ver `subscribedKey`). Na app nativa, com push ativo, renova logo
  // o registo: o FCM pode ter rodado o token, e é isto que garante que a
  // conta com sessão aberta é a que recebe.
  useEffect(() => {
    void isNativePlatform().then(async (isNative) => {
      setNative(isNative);
      if (isNative) {
        const { PushNotifications } = await import("@capacitor/push-notifications");
        const status = await PushNotifications.checkPermissions();
        setPermission(normalizeNativePermission(status.receive));
        const on = status.receive === "granted" && isScopeSubscribed(scope);
        setSubscribed(on);
        if (on && token) {
          const deviceToken = await registerNativeDevice();
          if (deviceToken) void sendNativeToken(token, deviceToken);
        }
        return;
      }
      if (!webSupported) return;
      setPermission(Notification.permission);
      navigator.serviceWorker.ready
        .then((registration) => registration.pushManager.getSubscription())
        .then((sub) => {
          // Subscrição criada antes da separação por lado (sem marca
          // nenhuma): era sempre a do cliente — marca-a como tal.
          const legacy =
            !!sub &&
            scope === "client" &&
            localStorage.getItem(subscribedKey("client")) === null &&
            !isScopeSubscribed("restaurant");
          if (legacy) setScopeSubscribed("client", true);
          setSubscribed(!!sub && isScopeSubscribed(scope));
        })
        .catch(() => setSubscribed(false));
    });
    // `token` fora das dependências: renovar uma vez por montagem chega.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webSupported, scope]);

  // Na app nativa, o utilizador pode ter ido às definições do SO ativar as
  // notificações (ver `openAppSettings`) — ao voltar à app, relê a permissão
  // para o interruptor refletir logo o novo estado.
  useEffect(() => {
    if (!native) return;
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void import("@capacitor/push-notifications").then(async ({ PushNotifications }) => {
        const status = await PushNotifications.checkPermissions();
        setPermission(normalizeNativePermission(status.receive));
      });
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [native]);

  const subscribeNative = useCallback(async (): Promise<NotificationPermission | "unsupported"> => {
    if (!token) return "unsupported";
    const { PushNotifications } = await import("@capacitor/push-notifications");

    const status = await PushNotifications.requestPermissions();
    const result = normalizeNativePermission(status.receive);
    setPermission(result);
    if (result !== "granted") return result;

    const deviceToken = await registerNativeDevice();
    if (deviceToken && (await sendNativeToken(token, deviceToken))) {
      setScopeSubscribed(scope, true);
      setSubscribed(true);
    } else {
      throw new Error("push-registration-failed");
    }
    return result;
  }, [token, scope]);

  const unsubscribeNative = useCallback(async () => {
    const { Capacitor } = await import("@capacitor/core");
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const deviceToken = localStorage.getItem(NATIVE_TOKEN_KEY);
    if (token && deviceToken) {
      await apiFetch("/device-tokens", {
        method: "DELETE",
        token,
        body: { platform: Capacitor.getPlatform(), token: deviceToken },
      }).catch(() => {});
    }
    setScopeSubscribed(scope, false);
    setSubscribed(false);
    // Só larga o registo FCM do dispositivo se o outro lado (cliente/painel)
    // também não o usa — senão desligava-lhe o push sem ele pedir.
    if (!isScopeSubscribed(otherScope(scope))) {
      await PushNotifications.unregister();
      localStorage.removeItem(NATIVE_TOKEN_KEY);
    }
  }, [token, scope]);

  /** @returns a permissão resultante — o chamador usa isto (não o estado do
   * hook, que só atualiza no próximo render) para saber logo se ficou
   * negada, sem esperar por um novo render. */
  const subscribe = useCallback(async (): Promise<NotificationPermission | "unsupported"> => {
    if (!supported || !token) return "unsupported";
    setBusy(true);
    try {
      if (native) return await subscribeNative();

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
      setScopeSubscribed(scope, true);
      setSubscribed(true);

      return result;
    } finally {
      setBusy(false);
    }
  }, [supported, native, subscribeNative, token, scope]);

  const unsubscribe = useCallback(async () => {
    if (!supported || !token) return;
    setBusy(true);
    try {
      if (native) {
        await unsubscribeNative();
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await apiFetch("/device-tokens", {
          method: "DELETE",
          token,
          body: { platform: "web", subscription: subscription.toJSON() },
        });
        // A subscrição do browser é partilhada pelos dois lados — só a
        // cancela se o outro também já não a usa.
        if (!isScopeSubscribed(otherScope(scope))) await subscription.unsubscribe();
      }
      setScopeSubscribed(scope, false);
      setSubscribed(false);
    } finally {
      setBusy(false);
    }
  }, [supported, native, unsubscribeNative, token, scope]);

  return { supported, native, permission, subscribed, busy, subscribe, unsubscribe };
}
