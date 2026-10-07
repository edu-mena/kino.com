import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "@/i18n";
import { PAGE_GAP, pageSlotsForWidth, paginationRange } from "@/lib/pagination-range";

/**
 * Paginação simples para listas client-side (cardápio, restaurantes, etc.) —
 * não usa `<a href>` porque não há uma URL real por página, só um recorte
 * do array já filtrado/ordenado em memória.
 *
 * Os botões têm sempre o mesmo tamanho: quando não cabem todos, mostra só a
 * janela à volta da atual com `…` (ver `paginationRange`), calculada a
 * partir da largura real disponível — antes desenhava todas as páginas e,
 * com muitas, elas encolhiam até ficarem ilegíveis.
 */
export function ListPagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const { t } = useTranslation();
  const navRef = useRef<HTMLElement>(null);
  // 7 até medir (SSR/1º render) — cabe num telemóvel comum sem cortar.
  const [maxSlots, setMaxSlots] = useState(7);
  const visible = totalPages > 1;

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const update = () => setMaxSlots(pageSlotsForWidth(el.clientWidth));
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);

  if (!visible) return null;

  return (
    <nav
      ref={navRef}
      aria-label={t("pagination.label")}
      className="mt-8 flex w-full items-center justify-center gap-2"
    >
      <button
        type="button"
        aria-label={t("pagination.previous")}
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border text-foreground transition-colors hover:border-primary disabled:pointer-events-none disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {paginationRange(page, totalPages, maxSlots).map((slot, i) =>
        slot === PAGE_GAP ? (
          <span
            key={`gap-${i}`}
            aria-hidden
            className="grid h-9 w-9 shrink-0 place-items-center text-sm font-semibold text-muted-foreground"
          >
            …
          </span>
        ) : (
          <button
            key={slot}
            type="button"
            onClick={() => onPageChange(slot)}
            aria-label={t("pagination.page", { n: slot })}
            aria-current={slot === page ? "page" : undefined}
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sm font-semibold transition-colors ${
              slot === page
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground hover:border-primary hover:text-primary"
            }`}
          >
            {slot}
          </button>
        ),
      )}

      <button
        type="button"
        aria-label={t("pagination.next")}
        disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border text-foreground transition-colors hover:border-primary disabled:pointer-events-none disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
