import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Estado vazio padronizado para listas (favoritos, resultados de pesquisa,
 * cardápio filtrado, tabelas do painel…). Antes cada rota desenhava o seu —
 * ícone, espaçamento e tom de texto ligeiramente diferentes em cada sítio.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title?: ReactNode;
  description?: ReactNode;
  /** Botão/link de saída (ex.: "Explorar restaurantes"). */
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("card-soft grid place-items-center gap-3 p-12 text-center", className)}>
      {Icon && <Icon className="h-10 w-10 text-muted-foreground" />}
      {title && <p className="font-display text-base font-bold text-foreground">{title}</p>}
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}
