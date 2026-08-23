import { Link } from "@tanstack/react-router";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DishCard } from "@/components/dish-card";
import { ListPagination } from "@/components/list-pagination";
import {
  IngredientSearchFilter,
  LocationFilterSelect,
  matchesLocation,
} from "@/components/search-filters";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { getAllIngredientNames, getRestaurant } from "@/data/helpers";
import { INITIAL_MENU_ITEMS } from "@/data/mockData";
import { formatKz } from "@/lib/format";
import { useTranslation } from "@/i18n";

const ingredientNames = getAllIngredientNames();
const overallMaxPrice = Math.max(...INITIAL_MENU_ITEMS.map((m) => m.price));

const sortOptions = [
  { value: "relevancia", labelKey: "cardapio.sortRelevance" },
  { value: "preco-asc", labelKey: "cardapio.sortPriceAsc" },
  { value: "preco-desc", labelKey: "cardapio.sortPriceDesc" },
  { value: "populares", labelKey: "cardapio.sortPopular" },
] as const;

const PAGE_SIZE = 12;

/**
 * Pesquisa + filtros + grade de pratos — o mesmo componente usado tanto no
 * cardápio geral (`/cardapio`) quanto dentro da página de um restaurante
 * (`/restaurantes/$id`), pra não ter duas apresentações diferentes do
 * mesmo cardápio conforme por onde se chega até ele.
 *
 * `lockedRestaurantId` fixa a lista a um restaurante só (usado dentro da
 * página do restaurante) — nesse caso o filtro de localização não faz
 * sentido (já é um restaurante específico) e some. `restaurantFilter`
 * é o caso do `/cardapio` chegando com `?restaurante=` — mostra um chip
 * removível em vez de fixar de vez.
 */
export function MenuBrowser({
  lockedRestaurantId,
  restaurantFilter,
  onClearRestaurantFilter,
}: {
  lockedRestaurantId?: string | undefined;
  restaurantFilter?: { id: string; name: string } | undefined;
  onClearRestaurantFilter?: (() => void) | undefined;
}) {
  const effectiveRestaurantId = lockedRestaurantId ?? restaurantFilter?.id;
  const { t } = useTranslation();

  // Só mostra uma categoria como chip se ela tiver pelo menos um prato —
  // sem filtro de restaurante, é a lista completa de categorias do
  // cardápio; com um restaurante fixado, só as categorias que ele de facto
  // tem (evita chips vazios tipo "Sobremesas" num restaurante sem nenhuma).
  const categories = useMemo(() => {
    const scoped = effectiveRestaurantId
      ? INITIAL_MENU_ITEMS.filter((m) => m.restaurantId === effectiveRestaurantId)
      : INITIAL_MENU_ITEMS;
    const ids = [...new Set(scoped.map((m) => m.category))];
    return ids.map((id) => ({ id, label: id }));
  }, [effectiveRestaurantId]);

  const [active, setActive] = useState<string>("todos");
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [neighborhood, setNeighborhood] = useState("todos");
  const [ingredient, setIngredient] = useState<string | null>(null);
  const [sort, setSort] = useState<(typeof sortOptions)[number]["value"]>("relevancia");
  const [maxPrice, setMaxPrice] = useState(overallMaxPrice);
  const [priceTouched, setPriceTouched] = useState(false);
  const [page, setPage] = useState(1);

  const filteredExceptPrice = useMemo(() => {
    return INITIAL_MENU_ITEMS.filter((item) => {
      const restaurant = getRestaurant(item.restaurantId);
      const byCat = active === "todos" || item.category === active;
      const byRestaurant = !effectiveRestaurantId || item.restaurantId === effectiveRestaurantId;
      const byQuery =
        !query ||
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        restaurant?.name.toLowerCase().includes(query.toLowerCase());
      const byIngredient = !ingredient || item.ingredients.some((i) => i.name === ingredient);
      const byNeighborhood =
        lockedRestaurantId || matchesLocation(restaurant?.neighborhood, neighborhood);
      return byCat && byRestaurant && byQuery && byIngredient && byNeighborhood;
    });
  }, [active, effectiveRestaurantId, lockedRestaurantId, query, ingredient, neighborhood]);

  const maxAvailablePrice = filteredExceptPrice.length
    ? Math.max(...filteredExceptPrice.map((m) => m.price))
    : overallMaxPrice;

  useEffect(() => {
    setMaxPrice((prev) => (priceTouched ? Math.min(prev, maxAvailablePrice) : maxAvailablePrice));
  }, [maxAvailablePrice, priceTouched]);

  // Se a categoria escolhida deixar de existir (ex: trocou de restaurante e
  // ele não tem essa categoria), volta pra "Todos" em vez de ficar preso
  // num filtro que não bate com nenhum chip visível.
  useEffect(() => {
    if (active !== "todos" && !categories.some((c) => c.id === active)) {
      setActive("todos");
    }
  }, [categories, active]);

  const filtered = useMemo(() => {
    const byPrice = filteredExceptPrice.filter((item) => item.price <= maxPrice);
    const sorted = [...byPrice];
    if (sort === "preco-asc") sorted.sort((a, b) => a.price - b.price);
    else if (sort === "preco-desc") sorted.sort((a, b) => b.price - a.price);
    else if (sort === "populares") sorted.sort((a, b) => (b.orderCount ?? 0) - (a.orderCount ?? 0));
    return sorted;
  }, [filteredExceptPrice, maxPrice, sort]);

  const activeExtraFilters =
    (neighborhood !== "todos" ? 1 : 0) + (ingredient ? 1 : 0) + (priceTouched ? 1 : 0);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [active, effectiveRestaurantId, query, ingredient, neighborhood, maxPrice, sort]);

  return (
    <div>
      {restaurantFilter && (
        <Link
          to="/cardapio"
          search={{}}
          className="mb-6 inline-flex w-fit items-center gap-1.5 rounded-full border border-primary bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
          onClick={onClearRestaurantFilter}
        >
          {restaurantFilter.name}
          <X className="h-3 w-3" />
        </Link>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-2xl border border-border bg-card p-2">
        <label className="flex min-w-0 items-center gap-2 px-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("cardapio.searchPlaceholder")}
            className="w-full min-w-0 bg-transparent py-2 text-sm outline-none"
          />
        </label>
        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          className="relative flex shrink-0 items-center gap-1.5 rounded-xl bg-surface px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {t("cardapio.filters")}
          {activeExtraFilters > 0 && (
            <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-brand-foreground">
              {activeExtraFilters}
            </span>
          )}
        </button>
      </div>

      <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto pb-1">
        {[{ id: "todos", label: t("common.all") }, ...categories].map((cat) => (
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

      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {filtered.length} {t("cardapio.results")}
        </p>
        <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
          <SelectTrigger className="w-48 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {t(opt.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {pageItems.map((item) => (
          <DishCard key={item.id} item={item} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="card-soft mt-4 p-10 text-center text-sm text-muted-foreground">
          {t("cardapio.noResults")}
        </p>
      )}

      <ListPagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto rounded-[2rem] border-none bg-card p-8">
          <DialogTitle className="font-display text-xl font-bold">{t("cardapio.filters")}</DialogTitle>

          <div className="mt-4 min-w-0">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {t("cardapio.priceUpTo")} {formatKz(maxPrice)}
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

          <div className="mt-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {t("cardapio.ingredient")}
            </p>
            <IngredientSearchFilter
              value={ingredient}
              onChange={setIngredient}
              allIngredientNames={ingredientNames}
            />
          </div>

          {!lockedRestaurantId && (
            <div className="mt-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {t("cardapio.location")}
              </p>
              <LocationFilterSelect value={neighborhood} onChange={setNeighborhood} />
            </div>
          )}

          <button
            type="button"
            onClick={() => setFiltersOpen(false)}
            className="mt-6 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            {t("cardapio.seeResults")} {filtered.length} {t("cardapio.results")}
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
