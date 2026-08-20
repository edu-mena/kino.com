import { cn } from "@/lib/utils";

function Bar({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-surface", className)} />;
}

/**
 * Skeleton estilo YouTube/Facebook mostrado enquanto `AuthProvider` ainda
 * não sabe se há uma sessão guardada (`isLoading`) — evita o "flash" da
 * home de convidado antes de trocar pra home logada (ou vice-versa).
 */
export function HomeSkeleton() {
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
        <Bar className="h-[52px] w-full rounded-2xl" />

        <Bar className="mt-6 h-56 w-full rounded-[2rem] sm:h-64" />
        <div className="mt-4 flex justify-center gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Bar key={i} className={cn("h-2 rounded-full", i === 0 ? "w-6" : "w-2")} />
          ))}
        </div>

        <div className="no-scrollbar mt-8 flex gap-5 overflow-x-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex w-20 shrink-0 flex-col items-center gap-2">
              <Bar className="h-16 w-16 shrink-0 rounded-full" />
              <Bar className="h-3 w-14" />
            </div>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
            >
              <Bar className="h-28 w-full rounded-none" />
              <div className="space-y-2 p-3">
                <Bar className="h-3 w-4/5" />
                <Bar className="h-3 w-1/2" />
                <Bar className="mt-1 h-4 w-2/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
