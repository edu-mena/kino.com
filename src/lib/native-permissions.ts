/**
 * Permissões na app nativa (Capacitor, Android/iOS) vs. browser.
 *
 * - Localização: na app usa `@capacitor/geolocation` (pede a permissão ao SO
 *   de verdade e distingue "negada de vez"); no browser, `navigator.geolocation`
 *   como sempre.
 * - "Dar permissão": quando o SO já não volta a mostrar o pedido (negada de
 *   vez), a única saída é o utilizador ativá-la à mão — `openAppSettings()`
 *   abre diretamente o ecrã de definições DESTA app (Android: "Informações da
 *   app"; iOS: Definições → Luku). No browser não há equivalente (não se pode
 *   abrir as definições do site por código), devolve `false`.
 *
 * Plugins carregados com `import()` dinâmico: nunca entram no bundle web.
 */

type CapacitorGlobal = { isNativePlatform?: () => boolean };

/** Síncrono: o runtime nativo injeta `window.Capacitor` antes da app arrancar. */
export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
  return !!cap?.isNativePlatform?.();
}

/** Abre as definições da app no SO. `false` fora da app nativa ou se falhar. */
export async function openAppSettings(): Promise<boolean> {
  if (!isNativeApp()) return false;
  try {
    const { NativeSettings, AndroidSettings, IOSSettings } =
      await import("capacitor-native-settings");
    await NativeSettings.open({
      optionAndroid: AndroidSettings.ApplicationDetails,
      optionIOS: IOSSettings.App,
    });
    return true;
  } catch {
    return false;
  }
}

export type DevicePositionResult =
  | { ok: true; coords: [number, number] }
  /** `denied` = sem permissão; `unavailable` = GPS desligado/timeout; `unsupported` = sem API. */
  | { ok: false; reason: "denied" | "unavailable" | "unsupported" };

const POSITION_OPTIONS = { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 };

/**
 * Posição atual do dispositivo. Na app nativa, se a permissão já estava
 * negada de vez (o SO não volta a perguntar), abre logo as definições da app
 * — é o que o utilizador espera ao tocar em "usar a minha localização".
 */
export async function getDevicePosition(): Promise<DevicePositionResult> {
  if (isNativeApp()) {
    try {
      const { Geolocation } = await import("@capacitor/geolocation");
      let perm = await Geolocation.checkPermissions();
      if (perm.location === "denied") {
        void openAppSettings();
        return { ok: false, reason: "denied" };
      }
      if (perm.location !== "granted") {
        perm = await Geolocation.requestPermissions({ permissions: ["location"] });
      }
      // Android: "coarseLocation" pode vir concedida sem a precisa — serve.
      if (perm.location !== "granted" && perm.coarseLocation !== "granted") {
        return { ok: false, reason: "denied" };
      }
      const pos = await Geolocation.getCurrentPosition(POSITION_OPTIONS);
      return { ok: true, coords: [pos.coords.latitude, pos.coords.longitude] };
    } catch {
      // Serviços de localização desligados, timeout, etc.
      return { ok: false, reason: "unavailable" };
    }
  }

  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return { ok: false, reason: "unsupported" };
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ ok: true, coords: [pos.coords.latitude, pos.coords.longitude] }),
      (err) =>
        resolve({
          ok: false,
          reason: err.code === err.PERMISSION_DENIED ? "denied" : "unavailable",
        }),
      POSITION_OPTIONS,
    );
  });
}
