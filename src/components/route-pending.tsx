import { PageShell } from "@/components/site-shell";
import { cn } from "@/lib/utils";

/**
 * Esqueletos das páginas que esperam pela API antes de desenhar (`loader`
 * de restaurante e de prato). Sem isto, tocar num card deixava a página
 * antiga parada 1–2s em rede móvel, sem sinal nenhum; agora a página troca
 * logo para a forma da seguinte e o conteúdo entra quando a API responde.
 * Usados como `pendingComponent` dessas rotas (ver `ROUTE_PENDING`).
 */

/** Mostra o esqueleto a partir de 150ms de espera e mantém-no pelo menos
 * 250ms — rápido o bastante para o toque ter resposta imediata, sem piscar
 * quando a API responde logo. */
export const ROUTE_PENDING = { pendingMs: 150, pendingMinMs: 250 } as const;

function Bar({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-surface", className)} />;
}

/** `/restaurantes/$id` — hero com a mesma altura, depois blocos de conteúdo. */
export function RestaurantPendingSkeleton() {
  return (
    <PageShell>
      <Bar className="h-[244px] rounded-none sm:h-[308px]" />
      <div className="mx-auto max-w-6xl space-y-3 px-4 pt-6 md:px-6">
        <Bar className="h-4 w-2/3 max-w-sm" />
        <Bar className="h-4 w-1/2 max-w-xs" />
        <div className="flex gap-2 pt-4">
          <Bar className="h-10 w-28 rounded-full" />
          <Bar className="h-10 w-28 rounded-full" />
          <Bar className="h-10 w-28 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-4 pt-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Bar key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      </div>
    </PageShell>
  );
}

/** `/prato/$dishId` — foto à esquerda (em cima no telemóvel), texto ao lado. */
export function DishPendingSkeleton() {
  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 pt-6 md:px-6">
        <Bar className="h-5 w-36" />
        <div className="mt-6 grid gap-8 md:grid-cols-2">
          <Bar className="mx-auto h-72 w-full max-w-sm rounded-[2rem] sm:h-96 md:max-w-none" />
          <div className="space-y-3">
            <Bar className="h-8 w-3/4" />
            <Bar className="h-4 w-1/3" />
            <Bar className="mt-4 h-4 w-full" />
            <Bar className="h-4 w-5/6" />
            <Bar className="mt-6 h-12 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </PageShell>
  );
}

/** `/pratos/$dishName` — título e a lista de restaurantes que servem o prato. */
export function DishListPendingSkeleton() {
  return (
    <PageShell>
      <div className="mx-auto max-w-4xl px-4 pt-6 md:px-6">
        <Bar className="h-5 w-36" />
        <Bar className="mt-6 h-8 w-2/3 max-w-sm" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Bar key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      </div>
    </PageShell>
  );
}
