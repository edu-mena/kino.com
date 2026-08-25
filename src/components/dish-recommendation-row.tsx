import { Link } from "@tanstack/react-router";
import { Plus, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { HorizontalCarousel } from "@/components/horizontal-carousel";
import { getCommonIngredients, getRestaurant, getRestaurantsOfferingDish } from "@/data/helpers";
import type { MenuItem } from "@/data/types";
import { useAddToBill } from "@/lib/bill";
import { formatKz } from "@/lib/format";
import { usePreferences } from "@/lib/preferences";
import { useTranslation } from "@/i18n";

/**
 * Linha horizontal reutilizável de pratos recomendados. Usada para
 * "Recomendações pra você", Fast-food, Grelhados, Em Alta, etc. — só muda a
 * lista de `items` recebida.
 */
export function DishRecommendationRow({ items }: { items: MenuItem[] }) {
  const { t } = useTranslation();
  const [active, setActive] = useState<MenuItem | null>(null);
  const addToBill = useAddToBill();
  const { excludedIngredients } = usePreferences();

  const commonIngredients = active ? getCommonIngredients(active.name) : [];
  const otherRestaurants = active
    ? getRestaurantsOfferingDish(active.name, active.restaurantId)
    : [];
  const activeConflicts = active
    ? active.ingredients.filter((i) => excludedIngredients.includes(i.name)).map((i) => i.name)
    : [];

  return (
    <>
      <HorizontalCarousel
        items={items}
        itemKey={(item) => item.id}
        renderItem={(item) => {
          const restaurant = getRestaurant(item.restaurantId);
          const hasConflict = item.ingredients.some((i) => excludedIngredients.includes(i.name));
          return (
            <button
              type="button"
              onClick={() => setActive(item)}
              className="card-soft flex w-40 shrink-0 flex-col overflow-hidden text-left transition-colors hover:border-brand"
            >
              <div className="relative h-28 w-full bg-surface sm:h-32">
                <img
                  src={item.image}
                  alt={item.name}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                {hasConflict && (
                  <span
                    aria-label={t("home.dishConflictLabel")}
                    className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-destructive text-destructive-foreground shadow-sm"
                  >
                    <TriangleAlert className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>
              <div className="p-3">
                <p className="truncate font-display text-sm font-bold text-foreground">
                  {item.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">{restaurant?.name}</p>
                <p className="mt-2 text-sm font-bold text-primary">{formatKz(item.price)}</p>
              </div>
            </button>
          );
        }}
      />

      <Dialog open={!!active} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto rounded-[2rem] border-none bg-card p-8">
          {active && (
            <>
              <div className="rounded-2xl bg-surface p-4">
                <img src={active.image} alt={active.name} className="mx-auto h-40 object-contain" />
              </div>
              <DialogTitle className="mt-4 font-display text-xl font-bold">
                {active.name}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {getRestaurant(active.restaurantId)?.name}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{active.description}</p>
              <p className="mt-3 text-lg font-bold text-primary">{formatKz(active.price)}</p>

              {activeConflicts.length > 0 && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-foreground">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <span>{t("home.dishConflictWarning", { list: activeConflicts.join(", ") })}</span>
                </div>
              )}

              {commonIngredients.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {t("home.commonIngredients")}
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

              {otherRestaurants.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {t("home.alsoAvailableAt")}
                  </p>
                  <div className="mt-2 space-y-2">
                    {otherRestaurants.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center gap-3 rounded-xl border border-border p-2"
                      >
                        <img
                          src={r.coverImage}
                          alt={r.name}
                          className="h-9 w-9 shrink-0 rounded-full object-cover"
                        />
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                          {r.name}
                        </span>
                        <Link
                          to="/cardapio"
                          search={{ restaurante: r.id }}
                          onClick={() => setActive(null)}
                          className="shrink-0 text-xs font-bold text-brand"
                        >
                          {t("home.seeHere")}
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 flex gap-3">
                <Link
                  to="/prato/$dishId"
                  params={{ dishId: active.id }}
                  onClick={() => setActive(null)}
                  className="flex-1 rounded-xl border border-border px-5 py-3 text-center text-sm font-semibold text-foreground transition-colors hover:border-primary"
                >
                  {t("home.seeDish")}
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    addToBill(active.restaurantId, active.id, active.name);
                    setActive(null);
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  <Plus className="h-4 w-4" />
                  {t("common.add")}
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
