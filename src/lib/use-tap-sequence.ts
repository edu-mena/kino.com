import { useRef } from "react";

/**
 * Gesto de N toques/cliques CONSECUTIVOS, cada um dentro de `windowMs` do
 * anterior — usado para revelar uma ação escondida sem nenhuma pista visual
 * (aqui: entrar em `/sistema/entrar`, o painel de operadores, que nunca é
 * linkado na UI de propósito — ver `sistema_.entrar.tsx`).
 *
 * Design pensado para ser o mais seguro possível dentro do que é possível
 * num gesto client-side (não é, e não pretende ser, autenticação — só evita
 * expor o caminho por acidente a scraping/SEO/alguém a espreitar):
 * - Janela de tempo curta entre toques (não `count >= 7` alguma vez na
 *   vida da página) — um clique perdido no meio de um dia inteiro de uso
 *   normal nunca acumula; só uma sequência rápida e deliberada conta.
 * - Contador em `useRef`, não em estado — não causa re-render a cada toque
 *   (evita qualquer efeito colateral visível, como o card "piscar").
 * - Reset total após completar — não fica "meio armado" para a próxima
 *   visita.
 * - Puramente em memória, nada em localStorage/URL/analytics — não deixa
 *   rasto entre sessões nem é visível a quem inspeciona storage.
 */
export function useTapSequence(requiredTaps: number, windowMs: number, onComplete: () => void) {
  const countRef = useRef(0);
  const lastTapAtRef = useRef(0);

  return () => {
    const now = Date.now();
    if (now - lastTapAtRef.current > windowMs) {
      countRef.current = 0;
    }
    lastTapAtRef.current = now;
    countRef.current += 1;

    if (countRef.current >= requiredTaps) {
      countRef.current = 0;
      onComplete();
    }
  };
}
