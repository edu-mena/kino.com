import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  IngredientSearchFilter,
  LocationFilterSelect,
  matchesLocation,
} from "@/components/search-filters";
import { getAllIngredientNames, getMenuCategories, getRestaurant } from "@/data/helpers";
import type { MenuItem } from "@/data/types";
import { useMenuItems } from "@/data/use-menu-items";
import { formatKz } from "@/lib/format";
import { useTranslation } from "@/i18n";

const categories = getMenuCategories();
const ingredientNames = getAllIngredientNames();

export function HeaderSearch() {
  const { t } = useTranslation();
  const items = useMenuItems();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [neighborhood, setNeighborhood] = useState<string>("todos");
  const [ingredient, setIngredient] = useState<string | null>(null);

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
        !query ||
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        restaurant?.name.toLowerCase().includes(query.toLowerCase());
      const byCategory = !category || item.category === category;
      const byIngredient = !ingredient || item.ingredients.some((i) => i.name === ingredient);
      const byNeighborhood = matchesLocation(restaurant?.neighborhood, neighborhood);
      return byQuery && byCategory && byIngredient && byNeighborhood;
    });
  }, [items, query, category, ingredient, neighborhood]);

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
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto rounded-[2rem] border-none bg-card p-8">
          <DialogTitle className="font-display text-xl font-bold">
            {t("search.dialogTitle")}
          </DialogTitle>

          <label className="mt-3 flex min-w-0 items-center gap-2 rounded-xl border border-border bg-background px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("search.inputPlaceholder")}
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>

          <div className="mt-4 min-w-0">
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

          <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2">
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

          <div className="mt-4 min-w-0">
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
                  className="shrink-0 rounded-full border border-border"
                >
                  {cat}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <div className="mt-6 min-w-0 max-h-80 overflow-y-auto">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {t("search.resultsCount", { count: filtered.length })}
              </p>
              {filtered.map((item) => (
                <SearchResultRow key={item.id} item={item} onSelect={() => setOpen(false)} />
              ))}
              {filtered.length === 0 && (
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
      className="flex items-center gap-3 rounded-xl border border-border p-2 transition-colors hover:border-primary"
    >
      <img
        src={item.image}
        alt=""
        className="h-11 w-11 shrink-0 rounded-lg bg-surface object-contain"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{item.name}</p>
        <p className="truncate text-xs text-muted-foreground">{restaurant?.name}</p>
      </div>
      <span className="shrink-0 text-sm font-bold text-primary">{formatKz(item.price)}</span>
    </Link>
  );
}
