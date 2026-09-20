import { cn } from "@/lib/utils";

function Bar({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-surface", className)} />;
}

/**
 * Skeleton genérico mostrado em QUALQUER rota enquanto `AuthProvider` ainda
 * não sabe se há uma sessão guardada (`isLoading`, ver `@/lib/auth`) —
 * montado uma única vez em `__root.tsx`, à volta de `<Outlet />`, para
 * cobrir todas as páginas de uma vez. Evita o "flash" de conteúdo de
 * convidado trocando para conteúdo logado (ou vice-versa), e o de páginas
 * que decidem redirecionar/renderizar com base num `isLoggedIn` ainda por
 * resolver. Forma neutra (barra de topo + blocos de conteúdo) — não tenta
 * imitar nenhuma página em concreto, já que é partilhado por todas.
 */
export function AppSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/70 px-4 py-3 md:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <Bar className="h-8 w-28 shrink-0" />
          <div className="flex shrink-0 items-center gap-2">
            <Bar className="hidden h-9 w-32 rounded-xl md:block" />
            <Bar className="h-10 w-10 shrink-0 rounded-xl" />
            <Bar className="h-10 w-10 shrink-0 rounded-xl" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-6 md:px-6">
        <Bar className="h-7 w-2/3 max-w-xs" />
        <Bar className="mt-3 h-4 w-1/2 max-w-sm" />

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
            >
              <Bar className="h-28 w-full rounded-none" />
              <div className="space-y-2 p-3">
                <Bar className="h-3 w-4/5" />
                <Bar className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
