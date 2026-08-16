import { createFileRoute } from "@tanstack/react-router";
import { ChevronRight, MessageCircle, Phone, Search } from "lucide-react";
import icon from "@/assets/icon.png";
import { PageHeading, PageShell } from "@/components/site-shell";
import { helpTopics } from "@/lib/mock-data";

export const Route = createFileRoute("/ajuda")({
  head: () => ({
    meta: [
      { title: "Centro de ajuda — Kino.com" },
      {
        name: "description",
        content:
          "Respostas sobre pedidos, pagamentos, entregas e reembolsos, além de contacto direto com o suporte Kino.com.",
      },
      { property: "og:title", content: "Centro de ajuda — Kino.com" },
      { property: "og:description", content: "Respostas rápidas e suporte humano." },
      { property: "og:image", content: icon },
    ],
  }),
  component: Ajuda,
});

function Ajuda() {
  return (
    <PageShell>
      <PageHeading
        eyebrow="Suporte"
        title="Centro de ajuda"
        description="Escolha um tema ou fale com a nossa equipa."
      />
      <div className="mx-auto mt-8 max-w-3xl px-4 md:px-6">
        <label className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            placeholder="Como podemos ajudar?"
            className="w-full min-w-0 bg-transparent text-sm outline-none"
          />
        </label>

        <div className="card-soft mt-6 divide-y divide-border">
          {helpTopics.map((topic) => (
            <button
              key={topic}
              type="button"
              className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4 text-left"
            >
              <span className="min-w-0 truncate text-sm font-semibold">{topic}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="card-soft flex items-center gap-3 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface text-brand">
              <MessageCircle className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">Chat ao vivo</p>
              <p className="truncate text-xs text-muted-foreground">Resposta em ~2 minutos</p>
            </div>
          </div>
          <div className="card-soft flex items-center gap-3 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface text-brand">
              <Phone className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">+244 923 000 000</p>
              <p className="truncate text-xs text-muted-foreground">Todos os dias, 8h - 23h</p>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}