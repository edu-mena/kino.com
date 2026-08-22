import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, CircleHelp, MessageCircle, Phone, Search } from "lucide-react";
import { useMemo, useState } from "react";
import icon from "@/assets/icon.png";
import { PageHeading, PageShell } from "@/components/site-shell";
import { helpArticles } from "@/lib/mock-data";

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
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const filtered = useMemo(
    () =>
      query
        ? helpArticles.filter((a) => a.question.toLowerCase().includes(query.toLowerCase()))
        : helpArticles,
    [query],
  );

  const active = activeIndex !== null ? helpArticles[activeIndex] : null;

  return (
    <PageShell>
      <PageHeading
        eyebrow="Suporte"
        title="Centro de ajuda"
        description="Escolha um tema ou fale com a nossa equipa."
      />
      <div className="mx-auto mt-8 max-w-5xl px-4 md:px-6">
        {/* Mobile: um card de cada vez (lista ↔ visualização). Desktop: lado a lado. */}
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <div className={`min-w-0 ${activeIndex !== null ? "hidden lg:block" : "block"}`}>
            <label className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Como podemos ajudar?"
                className="w-full min-w-0 bg-transparent text-sm outline-none"
              />
            </label>

            <div className="card-soft mt-6 divide-y divide-border">
              {filtered.map((article) => {
                const index = helpArticles.indexOf(article);
                return (
                  <button
                    key={article.question}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    className={`group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4 text-left transition-colors hover:bg-surface ${
                      activeIndex === index ? "bg-surface" : ""
                    }`}
                  >
                    <span className="min-w-0 truncate text-sm font-semibold">
                      {article.question}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  Nenhum tema encontrado.
                </p>
              )}
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

          {/* Card de visualização */}
          <div className={`min-w-0 ${activeIndex !== null ? "block" : "hidden lg:block"}`}>
            <div className="card-soft sticky top-24 p-6">
              {active ? (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveIndex(null)}
                    className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary lg:hidden"
                  >
                    <ChevronLeft className="h-4 w-4" /> Voltar
                  </button>
                  <h2 className="font-display text-xl font-bold text-primary">
                    {active.question}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {active.answer}
                  </p>
                </>
              ) : (
                <div className="grid place-items-center gap-3 py-12 text-center">
                  <CircleHelp className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Escolha um tema à esquerda para ver a resposta.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
