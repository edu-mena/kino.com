import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Bike, ChevronLeft, ChevronRight, MapPin, Star, TriangleAlert } from "lucide-react";
import icon from "@/assets/icon.png";
import { PageShell } from "@/components/site-shell";
import { getCommonIngredients, getMenuItemsByName, getRestaurant } from "@/data/helpers";
import { formatKz } from "@/lib/format";
import { usePreferences } from "@/lib/preferences";
import { computeDishConflicts } from "@/lib/use-dish-conflicts";
import { rankDishOfferings, type DishOffering } from "@/lib/rank-dish-offerings";
import { useTranslation } from "@/i18n";

export const Route = createFileRoute("/pratos/$dishName")({
  loader: ({ params }) => {
    const items = getMenuItemsByName(params.dishName);
    if (items.length === 0) throw notFound();
    return { items };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Prato indisponível — Kino.com" }, { name: "robots", content: "noindex" }],
      };
    }
    return {
      meta: [
        { title: `${params.dishName} — Kino.com` },
        {
          name: "description",
          content: `Veja onde pedir ${params.dishName} — preços e restaurantes que o oferecem.`,
        },
        { property: "og:title", content: `${params.dishName} — Kino.com` },
        { property: "og:image", content: icon },
      ],
    };
  },
  component: DishOverview,
});

function DishOverview() {
  const { items } = Route.useLoaderData();
  const { t } = useTranslation();
  const { excludedIngredients, dietaryRestrictions, cuisinePreferences } = usePreferences();
  const ownListReason = t("home.dishConflictOwnListReason");

  const dishName = items[0]!.name;
  const commonIngredients = getCommonIngredients(dishName);
  const prices = items.map((i) => i.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  const offerings: DishOffering[] = items
    .map((item) => {
      const restaurant = getRestaurant(item.restaurantId);
      if (!restaurant) return null;
      const conflicts = computeDishConflicts(
        item.ingredients,
        excludedIngredients,
        dietaryRestrictions,
        ownListReason,
      );
      return { item, restaurant, conflicts };
    })
    .filter((o): o is DishOffering => o !== null);

  const ranked = rankDishOfferings(offerings, cuisinePreferences);
  const heroImage = ranked[0]?.item.image ?? items[0]!.image;
  const heroDescription = ranked[0]?.item.description ?? items[0]!.description;

  return (
    <PageShell>
      <div className="mx-auto max-w-4xl px-4 pt-6 md:px-6">
        <Link
          to="/cardapio"
          className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-primary"
        >
          <ChevronLeft className="h-4 w-4" /> Voltar ao cardápio
        </Link>

        <div className="mt-6 grid gap-8 md:grid-cols-2">
          <div className="grid place-items-center rounded-[2rem] bg-surface p-8">
            <img
              src={heroImage}
              alt={dishName}
              width={768}
              height={768}
              className="mx-auto block h-64 w-full max-w-sm object-contain sm:h-80"
            />
          </div>

          <div>
            <h1 className="text-3xl font-extrabold text-primary sm:text-4xl">{dishName}</h1>
            <p className="mt-2 text-lg font-bold text-primary">
              {minPrice === maxPrice
                ? formatKz(minPrice)
                : `${formatKz(minPrice)} – ${formatKz(maxPrice)}`}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{heroDescription}</p>

            {commonIngredients.length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Ingredientes comuns entre restaurantes
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {commonIngredients.map((name) => (
                    <span
                      key={name}
                      className="rounded-full bg-surface px-3 py-1 text-xs text-foreground"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <h2 className="mt-14 text-2xl font-extrabold text-primary">
          Escolha o restaurante ({ranked.length})
        </h2>
        <p className="text-sm text-muted-foreground">
          Ordenado pelas suas preferências, localização e preço.
        </p>

        <div className="mt-5 space-y-3">
          {ranked.map(({ item, restaurant, conflicts }) => (
            <Link
              key={item.id}
              to="/prato/$dishId"
              params={{ dishId: item.id }}
              className="card-soft flex items-center gap-4 p-4 transition-colors hover:border-brand"
            >
              <img
                src={restaurant.coverImage}
                alt=""
                className="h-16 w-16 shrink-0 rounded-xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-display text-sm font-bold text-foreground">
                    {restaurant.name}
                  </p>
                  {conflicts.length > 0 && (
                    <span
                      aria-label={t("home.dishConflictLabel")}
                      className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-destructive text-destructive-foreground"
                    >
                      <TriangleAlert className="h-3 w-3" />
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {restaurant.cuisine} · {restaurant.neighborhood}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 font-semibold text-foreground">
                    <Star className="h-3.5 w-3.5 fill-star text-star" />
                    {restaurant.rating}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {restaurant.distanceKm} km
                  </span>
                  {restaurant.isDeliveryAvailable && (
                    <span className="flex items-center gap-1">
                      <Bike className="h-3.5 w-3.5" />
                      {restaurant.estimatedDeliveryMinutes} min
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-sm font-bold text-primary">{formatKz(item.price)}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
