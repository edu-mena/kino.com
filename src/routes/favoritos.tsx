import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Soup, UserCheck } from "lucide-react";
import { useMemo, useState } from "react";
import icon from "@/assets/icon.png";
import { DishCard } from "@/components/dish-card";
import { EmptyState } from "@/components/empty-state";
import { FollowBar } from "@/components/follow-button";
import { PageHeading, PageShell } from "@/components/site-shell";
import { useMenuItems } from "@/data/use-menu-items";
import { useRestaurants } from "@/data/use-restaurants-query";
import { useFollows } from "@/lib/follows";
import { usePreferences } from "@/lib/preferences";
import { useTranslation } from "@/i18n";

export const Route = createFileRoute("/favoritos")({
  head: () => ({
    meta: [
      { title: "Favoritos — Luku.com" },
      {
        name: "description",
        content: "Os pratos que você mais gosta e os restaurantes que segue, num só lugar.",
      },
      { property: "og:title", content: "Favoritos — Luku.com" },
      { property: "og:image", content: icon },
    ],
  }),
  component: Favoritos,
});

type Tab = "dishes" | "restaurants";

function Favoritos() {
  const { favoriteDishIds } = usePreferences();
  const { follows } = useFollows();
  const { data: restaurants = [] } = useRestaurants();
  // Todos os itens (mock ou API) — um favorito resolve-se pelo id em
  // qualquer modo, não só no dataset local.
  const { items: allItems } = useMenuItems();
  const { t } = useTranslation();

  // Restaurantes seguidos, pela ordem em que foram seguidos (mais recente
  // primeiro, ver @/lib/follows).
  const followedRestaurants = useMemo(() => {
    const byId = new Map(restaurants.map((r) => [r.id, r]));
    return follows
      .map((f) => byId.get(f.restaurantId))
      .filter((r): r is NonNullable<typeof r> => r != null);
  }, [follows, restaurants]);
  const favoriteDishes = useMemo(() => {
    const byId = new Map(allItems.map((m) => [m.id, m]));
    return favoriteDishIds
      .map((id) => byId.get(id))
      .filter((item): item is NonNullable<typeof item> => item != null);
  }, [allItems, favoriteDishIds]);

  // Abre no separador que tem conteúdo — pratos por omissão.
  const [tab, setTab] = useState<Tab>(
    favoriteDishes.length === 0 && follows.length > 0 ? "restaurants" : "dishes",
  );

  const tabs: { key: Tab; label: string; icon: typeof Soup; count: number }[] = [
    { key: "dishes", label: t("favoritos.tabDishes"), icon: Soup, count: favoriteDishes.length },
    {
      key: "restaurants",
      label: t("favoritos.tabRestaurants"),
      icon: UserCheck,
      count: followedRestaurants.length,
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
          ) : followedRestaurants.length === 0 ? (
            <EmptyState
              icon={UserCheck}
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
              {followedRestaurants.map((r) => (
                <div
                  key={r.id}
                  className="card-soft overflow-hidden transition-colors hover:border-brand"
                >
                  <Link to="/restaurantes/$id" params={{ id: r.id }} className="block">
                    <div className="h-32 overflow-hidden bg-surface">
                      <img src={r.coverImage} alt={r.name} className="h-full w-full object-cover" />
                    </div>
                    <div className="px-4 pt-4">
                      <h2 className="truncate font-display text-base font-bold">{r.name}</h2>
                      <p className="truncate text-xs text-muted-foreground">{r.cuisine}</p>
                    </div>
                  </Link>
                  <div className="p-4 pt-3">
                    <FollowBar restaurantId={r.id} restaurantName={r.name} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
