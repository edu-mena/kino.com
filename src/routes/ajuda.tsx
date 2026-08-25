import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, CircleHelp, MessageCircle, Phone, Search } from "lucide-react";
import { useMemo, useState } from "react";
import icon from "@/assets/icon.png";
import { PageHeading, PageShell } from "@/components/site-shell";
import { useHelpArticles } from "@/lib/help-articles";
import { useTranslation } from "@/i18n";
import { useDebouncedValue } from "@/lib/use-debounced-value";

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
  const debouncedQuery = useDebouncedValue(query);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const { t } = useTranslation();
  const helpArticles = useHelpArticles();

  const filtered = useMemo(
    () =>
      debouncedQuery
        ? helpArticles.filter((a) =>
            a.question.toLowerCase().includes(debouncedQuery.toLowerCase()),
          )
        : helpArticles,
    [debouncedQuery, helpArticles],
  );

  const active = activeIndex !== null ? helpArticles[activeIndex] : null;

  return (
    <PageShell>
      <PageHeading
        eyebrow={t("ajuda.eyebrow")}
        title={t("ajuda.title")}
        description={t("ajuda.description")}
      />
      <div className="mx-auto mt-8 max-w-5xl px-4 md:px-6">
        {/* Mobile: um card de cada vez (lista ↔ visualização). Desktop: lado a lado. */}
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <div className={`min-w-0 ${activeIndex !== null ? "hidden lg:block" : "block"}`}>
            <label className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 transition-colors has-[:focus]:border-primary">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("ajuda.searchPlaceholder")}
                className="w-full min-w-0 bg-transparent text-sm outline-none"
              />
            </label>

            <div className="card-soft mt-6 divide-y divide-border">
              {filtered.map((article) => {
                const index = helpArticles.indexOf(article);
                return (
                  <button
                    key={article.id}
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
                  {t("ajuda.noResults")}
                </p>
              )}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <a
                href="https://wa.me/244930814277"
                target="_blank"
                rel="noopener noreferrer"
                className="card-soft flex items-center gap-3 p-4 transition-colors hover:border-primary"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface text-brand">
                  <MessageCircle className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{t("ajuda.liveChat")}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {t("ajuda.liveChatHint")}
                  </p>
                </div>
              </a>
              <a
                href="tel:+244923000000"
                className="card-soft flex items-center gap-3 p-4 transition-colors hover:border-primary"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface text-brand">
                  <Phone className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">+244 923 000 000</p>
                  <p className="truncate text-xs text-muted-foreground">{t("ajuda.phoneHint")}</p>
                </div>
              </a>
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
                    <ChevronLeft className="h-4 w-4" /> {t("common.back")}
                  </button>
                  <h2 className="font-display text-xl font-bold text-primary">{active.question}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {active.answer}
                  </p>
                </>
              ) : (
                <div className="grid place-items-center gap-3 py-12 text-center">
                  <CircleHelp className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">{t("ajuda.chooseTopicHint")}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
