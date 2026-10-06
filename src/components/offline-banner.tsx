import { Wifi, WifiOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "@/i18n";

const RESTORED_VISIBLE_MS = 2500;

/**
 * Faixa no topo quando a ligação cai A MEIO do uso (app e site) — as páginas
 * já carregadas continuam visíveis, mas pedidos, reservas e login falham;
 * sem isto a pessoa só via erros genéricos sem perceber porquê. Ao voltar a
 * rede, mostra "Ligação restabelecida" uns segundos e some.
 *
 * O ecrã de quando a app ABRE sem rede é outro: `capacitor/www/offline.html`
 * (Capacitor `server.errorPath`), porque aí esta app nem chega a carregar.
 */
export function OfflineBanner() {
  const { t } = useTranslation();
  // Começa "online": no SSR não há `navigator`, e assumir offline mostraria
  // a faixa por um instante em toda a gente.
  const [state, setState] = useState<"online" | "offline" | "restored">("online");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const goOffline = () => {
      if (timer.current) clearTimeout(timer.current);
      setState("offline");
    };
    const goOnline = () => {
      setState((prev) => (prev === "offline" ? "restored" : prev));
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setState("online"), RESTORED_VISIBLE_MS);
    };

    if (!navigator.onLine) goOffline();
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  if (state === "online") return null;

  const offline = state === "offline";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 px-4 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] text-center text-xs font-semibold text-white shadow-md sm:text-sm ${
        // Escuro fixo (não `bg-foreground`, que no tema escuro fica claro
        // e deixava o texto branco ilegível).
        offline ? "bg-neutral-900" : "bg-success"
      }`}
    >
      {offline ? (
        <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
      ) : (
        <Wifi className="h-4 w-4 shrink-0" aria-hidden />
      )}
      <span>{offline ? t("offlineBanner.offline") : t("offlineBanner.restored")}</span>
    </div>
  );
}
