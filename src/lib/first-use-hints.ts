import { useEffect, useState } from "react";

const STORAGE_PREFIX = "kino_admin_hint_seen_";

/**
 * Dica pontual mostrada só na primeira vez que o restaurante abre um
 * diálogo de criação (prato/promoção/story) — ao contrário do tour guiado,
 * que é um percurso de 5 passos, isto é um apontamento rápido no sítio
 * certo, sem interromper o fluxo. Uma vez dispensada (ou usada com
 * sucesso), nunca mais aparece — controlado por uma flag simples no
 * localStorage, uma por tipo de dica.
 */
export function useFirstUseHint(id: string) {
  // Assume "já visto" até confirmar o contrário — evita um flash da dica em
  // quem já a viu (SSR/primeira pintura sem acesso ao localStorage).
  const [seen, setSeen] = useState(true);

  useEffect(() => {
    try {
      setSeen(localStorage.getItem(STORAGE_PREFIX + id) === "1");
    } catch {
      // localStorage indisponível — trata como já visto, não insiste.
    }
  }, [id]);

  const dismiss = () => {
    setSeen(true);
    try {
      localStorage.setItem(STORAGE_PREFIX + id, "1");
    } catch {
      // ignora — sem storage, a dica volta a aparecer na próxima vez.
    }
  };

  return { shouldShow: !seen, dismiss };
}
