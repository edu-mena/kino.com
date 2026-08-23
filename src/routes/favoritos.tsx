import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import icon from "@/assets/icon.png";
import { PageHeading, PageShell } from "@/components/site-shell";
import { INITIAL_RESTAURANTS } from "@/data/mockData";
import { usePreferences } from "@/lib/preferences";

export const Route = createFileRoute("/favoritos")({
  head: () => ({
    meta: [
      { title: "Favoritos — Kino.com" },
      { name: "description", content: "Os restaurantes que você mais gosta, num só lugar." },
      { property: "og:title", content: "Favoritos — Kino.com" },
      { property: "og:image", content: icon },
    ],
  }),
  component: Favoritos,
});

function Favoritos() {
  const { favoriteRestaurantIds } = usePreferences();
  const favorites = INITIAL_RESTAURANTS.filter((r) => favoriteRestaurantIds.includes(r.id));

  return (
    <PageShell>
      <PageHeading eyebrow="Favoritos" title="Os seus restaurantes favoritos" />
      <div className="mx-auto mt-8 max-w-6xl px-4 md:px-6">
        {favorites.length === 0 ? (
          <div className="card-soft grid place-items-center gap-3 p-12 text-center">
            <Heart className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Ainda não guardou nenhum restaurante. Toque no coração de um restaurante para o
              guardar aqui.
            </p>
            <Link
              to="/restaurantes"
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Explorar restaurantes
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {favorites.map((r) => (
              <Link
                key={r.id}
                to="/cardapio"
                search={{ restaurante: r.id }}
                className="card-soft overflow-hidden transition-colors hover:border-brand"
              >
                <div className="h-32 overflow-hidden bg-surface">
                  <img src={r.coverImage} alt={r.name} className="h-full w-full object-cover" />
                </div>
                <div className="p-4">
                  <h2 className="truncate font-display text-base font-bold">{r.name}</h2>
                  <p className="truncate text-xs text-muted-foreground">{r.cuisine}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
