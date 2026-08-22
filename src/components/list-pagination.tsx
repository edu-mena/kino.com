import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Paginação simples para listas client-side (cardápio, restaurantes, etc.) —
 * não usa `<a href>` porque não há uma URL real por página, só um recorte
 * do array já filtrado/ordenado em memória.
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
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Paginação" className="mt-8 flex items-center justify-center gap-2">
      <button
        type="button"
        aria-label="Página anterior"
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
        className="grid h-9 w-9 place-items-center rounded-lg border border-border text-foreground transition-colors hover:border-primary disabled:pointer-events-none disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onPageChange(n)}
          aria-current={n === page ? "page" : undefined}
          className={`grid h-9 w-9 place-items-center rounded-lg text-sm font-semibold transition-colors ${
            n === page
              ? "bg-primary text-primary-foreground"
              : "border border-border text-muted-foreground hover:border-primary hover:text-primary"
          }`}
        >
          {n}
        </button>
      ))}

      <button
        type="button"
        aria-label="Próxima página"
        disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}
        className="grid h-9 w-9 place-items-center rounded-lg border border-border text-foreground transition-colors hover:border-primary disabled:pointer-events-none disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
