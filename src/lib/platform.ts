import { Capacitor } from "@capacitor/core";

/**
 * `true` dentro da app iOS (Capacitor). Usado onde a App Store impõe regras
 * próprias — "Iniciar sessão com Apple" (4.8) e esconder preços/mudança de
 * plano da subscrição dos restaurantes, pagos fora da app (3.1.1). No SSR é
 * sempre `false` (web): usar só em UI desenhada no cliente.
 */
export function isIosApp(): boolean {
  return Capacitor.getPlatform() === "ios";
}
