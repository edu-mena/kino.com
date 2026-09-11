import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Soup, Store } from "lucide-react";
import { useState } from "react";
import icon from "@/assets/icon.png";
import { DishCard } from "@/components/dish-card";
import { EmptyState } from "@/components/empty-state";
import { PageHeading, PageShell } from "@/components/site-shell";
import { getAllRestaurants, getMenuItem } from "@/data/helpers";
import { usePreferences } from "@/lib/preferences";
import { useTranslation } from "@/i18n";

export const Route = createFileRoute("/favoritos")({
  head: () => ({
    meta: [
      { title: "Favoritos — Luku.com" },
      {
        name: "description",
        content: "Os pratos e restaurantes que você mais gosta, num só lugar.",
      },
      { property: "og:title", content: "Favoritos — Luku.com" },
      { property: "og:image", content: icon },
    ],
  }),
  component: Favoritos,
});

type Tab = "dishes" | "restaurants";

function Favoritos() {
  const { favoriteRestaurantIds, favoriteDishIds } = usePreferences();
  const { t } = useTranslation();

  const favoriteRestaurants = getAllRestaurants().filter((r) =>
    favoriteRestaurantIds.includes(r.id),
  );
  const favoriteDishes = favoriteDishIds
    .map((id) => getMenuItem(id))
    .filter((item): item is NonNullable<typeof item> => item != null);

  // Abre no separador que tem conteúdo — pratos por omissão.
  const [tab, setTab] = useState<Tab>(
    favoriteDishes.length === 0 && favoriteRestaurants.length > 0 ? "restaurants" : "dishes",
  );

  const tabs: { key: Tab; label: string; icon: typeof Soup; count: number }[] = [
    { key: "dishes", label: t("favoritos.tabDishes"), icon: Soup, count: favoriteDishes.length },
    {
      key: "restaurants",
      label: t("favoritos.tabRestaurants"),
      icon: Store,
      count: favoriteRestaurants.length,
    },
  ];

  return (
    <PageShell>
      <PageHeading eyebrow={t("favoritos.eyebrow")} title={t("favoritos.title")} />
      <div className="mx-auto mt-8 max-w-6xl px-4 md:px-6">
        <div className="inline-flex rounded-xl border border-border bg-card p-0.5 text-sm font-semibold">
          {tabs.map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 transition-colors ${
                tab === key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
              <span
                className={`ml-0.5 rounded-full px-1.5 text-xs ${
                  tab === key ? "bg-primary-foreground/20" : "bg-surface"
                }`}
              >
                {count}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "dishes" ? (
            favoriteDishes.length === 0 ? (
              <EmptyState
                icon={Heart}
                description={t("favoritos.emptyDishes")}
                action={
                  <Link
                    to="/cardapio"
                    className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
                  >
                    {t("favoritos.exploreDishes")}
                  </Link>
                }
              />
            ) : (
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {favoriteDishes.map((item) => (
                  <DishCard key={item.id} item={item} />
                ))}
              </div>
            )
          ) : favoriteRestaurants.length === 0 ? (
            <EmptyState
              icon={Heart}
              description={t("favoritos.emptyText")}
              action={
                <Link
                  to="/restaurantes"
                  className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
                >
                  {t("favoritos.explore")}
                </Link>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {favoriteRestaurants.map((r) => (
                <Link
                  key={r.id}
                  to="/restaurantes/$id"
                  params={{ id: r.id }}
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
      </div>
    </PageShell>
  );
}
