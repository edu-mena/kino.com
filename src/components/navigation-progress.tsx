import { useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "@/i18n";

/** Abaixo disto a navegação é instantânea para quem a vê — a barra só
 * piscaria. */
const SHOW_AFTER_MS = 120;

/**
 * Barra fina no topo enquanto a próxima página carrega (código da rota e/ou
 * `loader` à espera da API). Medido com rede móvel simulada: abrir um prato
 * ou restaurante leva 1,2–2s, quase tudo à espera da resposta da API — e
 * nesse tempo a página antiga ficava parada sem sinal nenhum, parecia que o
 * toque não tinha pegado. Montada uma vez em `__root.tsx`, vale para todas
 * as rotas (cliente, painel do restaurante, sistema).
 */
export function NavigationProgress() {
  const { t } = useTranslation();
  const pending = useRouterState({ select: (s) => s.status === "pending" || s.isLoading });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!pending) {
      setVisible(false);
      return;
    }
    const timer = setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, [pending]);

  if (!visible) return null;

  return (
    <div
      role="progressbar"
      aria-label={t("navigationProgress.aria")}
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px] overflow-hidden bg-brand/15"
    >
      <div className="animate-nav-progress h-full w-2/5 rounded-full bg-brand" />
    </div>
  );
}
