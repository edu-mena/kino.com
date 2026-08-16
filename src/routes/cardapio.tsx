import { createFileRoute } from "@tanstack/react-router";
import { Search, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import icon from "@/assets/icon.png";
import { DishCard } from "@/components/dish-card";
import { PageHeading, PageShell } from "@/components/site-shell";
import { categories, dishes } from "@/lib/mock-data";

type CardapioSearch = { categoria?: string | undefined };

export const Route = createFileRoute("/cardapio")({
  validateSearch: (search: Record<string, unknown>): CardapioSearch => ({
    categoria: typeof search["categoria"] === "string" ? search["categoria"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Cardápio completo — Kino.com" },
      {
        name: "description",
        content:
          "Explore o cardápio do Kino.com: burgers, pizza, pratos angolanos, bebidas e sobremesas com entrega em Luanda.",
      },
      { property: "og:title", content: "Cardápio completo — Kino.com" },
      { property: "og:description", content: "Burgers, pizza, pratos, bebidas e sobremesas." },
      { property: "og:image", content: icon },
    ],
  }),
  component: Cardapio,
});

function Cardapio() {
  const { categoria } = Route.useSearch();
  const [active, setActive] = useState<string>(categoria ?? "todos");
  const [query, setQuery] = useState("");

  const filtered = dishes.filter((d) => {
    const byCat = active === "todos" || d.category === active;
    const byQuery =
      !query ||
      d.name.toLowerCase().includes(query.toLowerCase()) ||
      d.restaurant.toLowerCase().includes(query.toLowerCase());
    return byCat && byQuery;
  });

  return (
    <PageShell>
      <PageHeading
        eyebrow="Cardápio"
        title="Escolha o seu próximo prato"
        description="Filtre por categoria ou pesquise pelo nome do prato ou restaurante."
      />

      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="mt-8 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-2xl border border-border bg-card p-2">
          <label className="flex min-w-0 items-center gap-2 px-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar pratos, restaurantes..."
              className="w-full min-w-0 bg-transparent py-2 text-sm outline-none"
            />
          </label>
          <span className="flex shrink-0 items-center gap-1.5 rounded-xl bg-surface px-3 py-2 text-xs font-semibold text-muted-foreground">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filtros
          </span>
        </div>

        <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto pb-1">
          {[{ id: "todos", label: "Todos" }, ...categories].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActive(cat.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                active === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground hover:border-primary"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <p className="mt-6 text-sm text-muted-foreground">{filtered.length} resultados</p>

        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {filtered.map((dish) => (
            <DishCard key={dish.id} dish={dish} />
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="card-soft mt-4 p-10 text-center text-sm text-muted-foreground">
            Nenhum prato encontrado. Tente outra pesquisa.
          </p>
        )}
      </div>
    </PageShell>
  );
}