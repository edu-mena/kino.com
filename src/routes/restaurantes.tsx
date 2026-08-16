import { createFileRoute, Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import icon from "@/assets/icon.png";
import { PageHeading, PageShell } from "@/components/site-shell";
import { formatKz, restaurants } from "@/lib/mock-data";

export const Route = createFileRoute("/restaurantes")({
  head: () => ({
    meta: [
      { title: "Restaurantes em Luanda — Kino.com" },
      {
        name: "description",
        content:
          "Os restaurantes parceiros do Kino.com em Luanda: grelhados, pizza, cozinha angolana e sobremesas.",
      },
      { property: "og:title", content: "Restaurantes em Luanda — Kino.com" },
      { property: "og:description", content: "Descubra os nossos restaurantes parceiros." },
      { property: "og:image", content: icon },
    ],
  }),
  component: Restaurantes,
});

function Restaurantes() {
  return (
    <PageShell>
      <PageHeading
        eyebrow="Parceiros"
        title="Restaurantes perto de você"
        description="Cozinhas selecionadas, avaliadas pelos nossos clientes em Luanda."
      />
      <div className="mx-auto mt-8 grid max-w-6xl gap-4 px-4 sm:grid-cols-2 md:px-6 lg:grid-cols-3">
        {restaurants.map((r) => (
          <Link
            key={r.id}
            to="/cardapio"
            className="card-soft overflow-hidden transition-colors hover:border-brand"
          >
            <div className="h-40 overflow-hidden bg-surface">
              <img
                src={r.image}
                alt={`Interior do restaurante ${r.name}`}
                loading="lazy"
                width={1024}
                height={768}
                className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
              />
            </div>
            <div className="p-5">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                <h2 className="truncate font-display text-lg font-bold">{r.name}</h2>
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-surface px-2 py-1 text-xs font-bold">
                  <Star className="h-3.5 w-3.5 fill-star text-star" />
                  {r.rating}
                </span>
              </div>
              <p className="truncate text-sm text-muted-foreground">{r.tags}</p>
              <p className="mt-3 text-xs text-muted-foreground">
                {r.time} · Entrega {formatKz(r.fee)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}