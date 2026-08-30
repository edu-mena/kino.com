import { Link } from "@tanstack/react-router";
import {
  ChevronDown,
  ChevronRight,
  Search,
  SlidersHorizontal,
  Star,
  Store,
  UtensilsCrossed,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DietaryShortcutPicker } from "@/components/dietary-shortcut-picker";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  IngredientSearchFilter,
  LocationFilterSelect,
  matchesLocation,
} from "@/components/search-filters";
import {
  getAllIngredientNames,
  getAllRestaurants,
  getMenuCategories,
  getRestaurant,
} from "@/data/helpers";
import type { MenuItem, Restaurant } from "@/data/types";
import { useMenuItems } from "@/data/use-menu-items";
import { formatKz } from "@/lib/format";
import { useTranslation } from "@/i18n";
import { useDebouncedValue } from "@/lib/use-debounced-value";

const categories = getMenuCategories();
const ingredientNames = getAllIngredientNames();
const restaurants = getAllRestaurants();

export function HeaderSearch() {
  const { t } = useTranslation();
  const items = useMenuItems();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [neighborhood, setNeighborhood] = useState<string>("todos");
  const [ingredient, setIngredient] = useState<string | null>(null);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const overallMaxPrice = useMemo(
    () => (items.length ? Math.max(...items.map((m) => m.price)) : 0),
    [items],
  );
  const [maxPrice, setMaxPrice] = useState(overallMaxPrice);
  const [priceTouched, setPriceTouched] = useState(false);

  // Filtrados por tudo MENOS o preço — define até onde a faixa de preço
  // pode ir com os outros filtros já aplicados.
  const filteredExceptPrice = useMemo(() => {
    return items.filter((item) => {
      const restaurant = getRestaurant(item.restaurantId);
      const byQuery =
        !debouncedQuery ||
        item.name.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        restaurant?.name.toLowerCase().includes(debouncedQuery.toLowerCase());
      const byCategory = !category || item.category === category;
      const byIngredient = !ingredient || item.ingredients.some((i) => i.name === ingredient);
      const byNeighborhood = matchesLocation(restaurant?.neighborhood, neighborhood);
      return byQuery && byCategory && byIngredient && byNeighborhood;
    });
  }, [items, debouncedQuery, category, ingredient, neighborhood]);

  const maxAvailablePrice = filteredExceptPrice.length
    ? Math.max(...filteredExceptPrice.map((m) => m.price))
    : overallMaxPrice;

  // Sem toque manual, a faixa de preço segue o mais caro entre os
  // resultados já filtrados pelos outros critérios. Uma vez tocada, o
  // valor escolhido persiste, só sendo limitado se o teto disponível cair.
  useEffect(() => {
    setMaxPrice((prev) => (priceTouched ? Math.min(prev, maxAvailablePrice) : maxAvailablePrice));
  }, [maxAvailablePrice, priceTouched]);

  const filtered = useMemo(
    () => filteredExceptPrice.filter((item) => item.price <= maxPrice),
    [filteredExceptPrice, maxPrice],
  );

  // Restaurantes correspondem por nome/cozinha e localização — categoria,
  // ingrediente e preço são atributos do prato, não fazem sentido aqui.
  const matchedRestaurants = useMemo(() => {
    if (!debouncedQuery) return [];
    return restaurants.filter((r) => {
      const byQuery =
        r.name.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        r.cuisine.toLowerCase().includes(debouncedQuery.toLowerCase());
      const byNeighborhood = matchesLocation(r.neighborhood, neighborhood);
      return byQuery && byNeighborhood;
    });
  }, [debouncedQuery, neighborhood]);

  const totalResults = matchedRestaurants.length + filtered.length;
  const activeFilterCount =
    (category ? 1 : 0) +
    (ingredient ? 1 : 0) +
    (neighborhood !== "todos" ? 1 : 0) +
    (priceTouched && maxPrice < overallMaxPrice ? 1 : 0);

  return (
    <>
      <div data-tour="search" className="flex items-center gap-[5px]">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t("search.buttonLabel")}
          className="grid shrink-0 place-items-center rounded-full bg-primary p-4 text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Search className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full rounded-2xl border border-primary bg-card px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:border-primary"
        >
          {t("search.triggerPlaceholder")}
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto overflow-x-hidden rounded-[2rem] border-none bg-card p-6 shadow-2xl">
          <DialogTitle className="font-display text-lg font-bold text-primary">
            {t("search.dialogTitle")}
          </DialogTitle>

          <div className="mt-3 flex min-w-0 items-center gap-[5px]">
            <span className="grid shrink-0 place-items-center rounded-full bg-primary p-4 text-primary-foreground">
              <Search className="h-4 w-4" />
            </span>
            <label className="flex w-full min-w-0 items-center rounded-2xl border border-primary bg-card px-4 py-3 transition-colors has-[:focus]:border-brand">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("search.inputPlaceholder")}
                className="w-full min-w-0 bg-transparent text-sm outline-none"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={() => setFiltersExpanded((v) => !v)}
            className="mt-3 flex w-full items-center gap-2 rounded-xl bg-surface px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-brand"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 text-left">{t("search.filters")}</span>
            {activeFilterCount > 0 && (
              <span className="grid h-4 min-w-4 shrink-0 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-brand-foreground">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown
              className={`h-3.5 w-3.5 shrink-0 transition-transform ${filtersExpanded ? "rotate-180" : ""}`}
            />
          </button>

          {filtersExpanded && (
            <div className="mt-3 min-w-0 space-y-5 rounded-xl border border-border p-4">
              <div className="min-w-0">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {t("search.priceUpTo", { price: formatKz(maxPrice) })}
                </p>
                <Slider
                  min={0}
                  max={maxAvailablePrice}
                  step={500}
                  value={[maxPrice]}
                  onValueChange={([v]) => {
                    setPriceTouched(true);
                    setMaxPrice(v ?? maxAvailablePrice);
                  }}
                />
              </div>

              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {t("search.ingredient")}
                  </p>
                  <IngredientSearchFilter
                    value={ingredient}
                    onChange={setIngredient}
                    allIngredientNames={ingredientNames}
                  />
                </div>

                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {t("search.location")}
                  </p>
                  <LocationFilterSelect value={neighborhood} onChange={setNeighborhood} />
                </div>
              </div>

              <div className="min-w-0">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {t("search.category")}
                </p>
                <ToggleGroup
                  type="single"
                  value={category ?? ""}
                  onValueChange={(v) => setCategory(v || undefined)}
                  className="no-scrollbar flex-nowrap justify-start overflow-x-auto"
                >
                  {categories.map((cat) => (
                    <ToggleGroupItem
                      key={cat}
                      value={cat}
                      className="shrink-0 rounded-full border border-border data-[state=on]:border-brand data-[state=on]:bg-brand data-[state=on]:text-brand-foreground"
                    >
                      {cat}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>

              <DietaryShortcutPicker
                ctaLabel={t("search.dietaryCta")}
                onNavigate={() => setOpen(false)}
              />
            </div>
          )}

          <div className="mt-5 min-w-0 border-t border-border pt-4">
            <p className="text-xs font-semibold text-muted-foreground">
              {t("search.resultsCount", { count: totalResults })}
            </p>

            <div className="mt-3 max-h-80 space-y-5 overflow-y-auto">
              {matchedRestaurants.length > 0 && (
                <div className="space-y-2">
                  <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand">
                    <Store className="h-3.5 w-3.5" />
                    {t("search.restaurantsLabel")}
                  </p>
                  {matchedRestaurants.map((restaurant) => (
                    <RestaurantResultRow
                      key={restaurant.id}
                      restaurant={restaurant}
                      onSelect={() => setOpen(false)}
                    />
                  ))}
                </div>
              )}

              {filtered.length > 0 && (
                <div className="space-y-2">
                  {matchedRestaurants.length > 0 && (
                    <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand">
                      <UtensilsCrossed className="h-3.5 w-3.5" />
                      {t("search.dishesLabel")}
                    </p>
                  )}
                  {filtered.map((item) => (
                    <SearchResultRow key={item.id} item={item} onSelect={() => setOpen(false)} />
                  ))}
                </div>
              )}

              {totalResults === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {t("search.noResults")}
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SearchResultRow({ item, onSelect }: { item: MenuItem; onSelect: () => void }) {
  const restaurant = getRestaurant(item.restaurantId);
  return (
    <Link
      to="/prato/$dishId"
      params={{ dishId: item.id }}
      onClick={onSelect}
      className="flex items-center gap-3 rounded-xl border border-transparent p-2 transition-colors hover:border-brand hover:bg-brand/5"
    >
      <img
        src={item.image}
        alt=""
        className="h-12 w-12 shrink-0 rounded-xl bg-surface object-contain"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{item.name}</p>
        <p className="truncate text-xs text-muted-foreground">{restaurant?.name}</p>
      </div>
      <span className="shrink-0 text-sm font-bold text-primary">{formatKz(item.price)}</span>
    </Link>
  );
}

function RestaurantResultRow({
  restaurant,
  onSelect,
}: {
  restaurant: Restaurant;
  onSelect: () => void;
}) {
  return (
    <Link
      to="/restaurantes/$id"
      params={{ id: restaurant.id }}
      onClick={onSelect}
      className="flex items-center gap-3 rounded-xl border border-transparent p-2 transition-colors hover:border-brand hover:bg-brand/5"
    >
      <img
        src={restaurant.coverImage}
        alt=""
        className="h-12 w-12 shrink-0 rounded-xl bg-surface object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{restaurant.name}</p>
        <p className="truncate text-xs text-muted-foreground">{restaurant.cuisine}</p>
      </div>
      <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-muted-foreground">
        <Star className="h-3.5 w-3.5 fill-star text-star" />
        {restaurant.rating}
        <ChevronRight className="h-4 w-4 text-brand" />
      </span>
    </Link>
  );
}
