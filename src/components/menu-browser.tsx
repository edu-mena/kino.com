import { Link } from "@tanstack/react-router";
import { LayoutGrid, List, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DietaryShortcutPicker } from "@/components/dietary-shortcut-picker";
import { DishCard } from "@/components/dish-card";
import { DishGroupCard } from "@/components/dish-group-card";
import { DishListRow } from "@/components/dish-list-row";
import { LazyImage } from "@/components/lazy-image";
import { ListPagination } from "@/components/list-pagination";
import { LocationFilterSelect, matchesLocation } from "@/components/search-filters";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { getRestaurant } from "@/data/helpers";
import type { MenuItem } from "@/data/types";
import { useMenuItems } from "@/data/use-menu-items";
import { useAddToBill } from "@/lib/bill";
import { personalizedRestaurantDistanceKm } from "@/lib/delivery-eval";
import { formatKz } from "@/lib/format";
import { groupMenuItemsByName } from "@/lib/group-dishes-by-name";
import { useLocation } from "@/lib/location";
import { usePreferences } from "@/lib/preferences";
import { buildRecommendedDishes } from "@/lib/recommend-dishes";
import { translateMenuCategory, useTranslation } from "@/i18n";
import { useDebouncedValue } from "@/lib/use-debounced-value";

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
  initialCategory,
}: {
  lockedRestaurantId?: string | undefined;
  restaurantFilter?: { id: string; name: string } | undefined;
  onClearRestaurantFilter?: (() => void) | undefined;
  /** Categoria vinda de `?categoria=` (ex.: cards de categoria da home) —
   * pré-seleciona o chip correspondente ao entrar na página. */
  initialCategory?: string | undefined;
}) {
  const effectiveRestaurantId = lockedRestaurantId ?? restaurantFilter?.id;
  const { t, locale } = useTranslation();
  const items = useMenuItems();
  const { cuisinePreferences, excludedIngredients, dietaryRestrictions } = usePreferences();
  const { selected: selectedAddress } = useLocation();
  const addToBill = useAddToBill();
  const overallMaxPrice = useMemo(
    () => (items.length ? Math.max(...items.map((m) => m.price)) : 0),
    [items],
  );

  // Só mostra uma categoria como chip se ela tiver pelo menos um prato —
  // sem filtro de restaurante, é a lista completa de categorias do
  // cardápio; com um restaurante fixado, só as categorias que ele de facto
  // tem (evita chips vazios tipo "Sobremesas" num restaurante sem nenhuma).
  const categories = useMemo(() => {
    const scoped = effectiveRestaurantId
      ? items.filter((m) => m.restaurantId === effectiveRestaurantId)
      : items;
    const ids = [...new Set(scoped.map((m) => m.category))];
    return ids.map((id) => ({ id, label: translateMenuCategory(id, locale) }));
  }, [items, effectiveRestaurantId, locale]);

  const [active, setActive] = useState<string>(initialCategory ?? "todos");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [neighborhood, setNeighborhood] = useState("todos");
  // Preso a UM restaurante (a própria página dele): "Relevância" (não há o
  // que diversificar entre restaurantes) e "Mais pedidos" somem do
  // <Select> — só sobra ordenar por preço; "menor primeiro" vira o padrão.
  const [sort, setSort] = useState<(typeof sortOptions)[number]["value"]>(
    lockedRestaurantId ? "preco-asc" : "relevancia",
  );
  const visibleSortOptions = lockedRestaurantId
    ? sortOptions.filter((o) => o.value !== "relevancia" && o.value !== "populares")
    : sortOptions;
  const [maxPrice, setMaxPrice] = useState(overallMaxPrice);
  const [priceTouched, setPriceTouched] = useState(false);
  const [page, setPage] = useState(1);
  // Cartões (grelha, como no resto do app) ou lista compacta — só existe
  // preso a UM restaurante; a lista/grelha genérica de `/cardapio` não
  // muda. Lista é o padrão.
  const [viewMode, setViewMode] = useState<"list" | "card">("list");
  // Prato aberto no popup de detalhe (clique na miniatura da visão em
  // lista) — a visão em cartões não usa isto, o próprio card já mostra o
  // essencial.
  const [detailItem, setDetailItem] = useState<MenuItem | null>(null);

  const filteredExceptPrice = useMemo(() => {
    return items.filter((item) => {
      const restaurant = getRestaurant(item.restaurantId);
      const byCat = active === "todos" || item.category === active;
      const byRestaurant = !effectiveRestaurantId || item.restaurantId === effectiveRestaurantId;
      const byQuery =
        !debouncedQuery ||
        item.name.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        restaurant?.name.toLowerCase().includes(debouncedQuery.toLowerCase());
      const byNeighborhood =
        lockedRestaurantId || matchesLocation(restaurant?.neighborhood, neighborhood);
      return byCat && byRestaurant && byQuery && byNeighborhood;
    });
  }, [items, active, effectiveRestaurantId, lockedRestaurantId, debouncedQuery, neighborhood]);

  const maxAvailablePrice = filteredExceptPrice.length
    ? Math.max(...filteredExceptPrice.map((m) => m.price))
    : overallMaxPrice;

  useEffect(() => {
    setMaxPrice((prev) => (priceTouched ? Math.min(prev, maxAvailablePrice) : maxAvailablePrice));
  }, [maxAvailablePrice, priceTouched]);

  // `initialCategory` muda quando se navega de um card de categoria pra
  // outro sem sair de `/cardapio` (o componente continua montado) — sem
  // isto o chip ficava preso na categoria anterior.
  useEffect(() => {
    if (initialCategory) setActive(initialCategory);
  }, [initialCategory]);

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
    if (sort === "preco-asc") return [...byPrice].sort((a, b) => a.price - b.price);
    if (sort === "preco-desc") return [...byPrice].sort((a, b) => b.price - a.price);
    if (sort === "populares") {
      return [...byPrice].sort((a, b) => (b.orderCount ?? 0) - (a.orderCount ?? 0));
    }
    // "Relevância" (default): perto do usuário + preferências de cozinha e
    // restrições, sem amontoar vários pratos seguidos do mesmo restaurante
    // (ver `buildRecommendedDishes`). Preso a UM restaurante (menu próprio,
    // ou `?restaurante=`), tudo já é a mesma "key" — mantém a ordem crua.
    if (effectiveRestaurantId) return byPrice;
    return buildRecommendedDishes({
      items: byPrice,
      getCuisine: (restaurantId) => getRestaurant(restaurantId)?.cuisine,
      distanceKmOf: (restaurantId) => {
        const restaurant = getRestaurant(restaurantId);
        return personalizedRestaurantDistanceKm(
          restaurantId,
          selectedAddress,
          restaurant?.distanceKm ?? 0,
        );
      },
      cuisinePreferences,
      excludedIngredients,
      dietaryRestrictions,
      ownListReason: t("home.dishConflictOwnListReason"),
    });
  }, [
    filteredExceptPrice,
    maxPrice,
    sort,
    effectiveRestaurantId,
    selectedAddress,
    cuisinePreferences,
    excludedIngredients,
    dietaryRestrictions,
    t,
  ]);

  const activeExtraFilters = (neighborhood !== "todos" ? 1 : 0) + (priceTouched ? 1 : 0);

  // Pesquisando por texto (e não dentro de um restaurante específico) —
  // agrupa por nome de prato: 1 resultado por prato em vez de 1 por
  // restaurante que o oferece, ver `/pratos/$dishName`.
  const isGroupedSearch = !!debouncedQuery && !effectiveRestaurantId;
  const dishGroups = useMemo(
    () => (isGroupedSearch ? groupMenuItemsByName(filtered) : []),
    [isGroupedSearch, filtered],
  );
  const resultCount = isGroupedSearch ? dishGroups.length : filtered.length;

  const totalPages = Math.max(1, Math.ceil(resultCount / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageGroups = dishGroups.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [active, effectiveRestaurantId, debouncedQuery, neighborhood, maxPrice, sort]);

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

      {!lockedRestaurantId && (
        <>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-2xl border border-border bg-card p-2 transition-colors has-[:focus]:border-primary">
            <label className="flex min-w-0 items-center gap-2 px-2">
              <Search className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} />
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

          <DietaryShortcutPicker ctaLabel={t("cardapio.dietaryCta")} />
        </>
      )}

      {/* Topo arredondado, fundo reto e encostado na linha cinzenta abaixo
          — como abas presas ao separador, sem gap entre elas e a linha. */}
      <div className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto border-b border-border">
        {[{ id: "todos", label: t("common.all") }, ...categories].map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActive(cat.id)}
            className={`shrink-0 rounded-t-lg rounded-b-none px-4 py-2 text-sm font-semibold transition-colors ${
              active === cat.id
                ? "bg-primary text-primary-foreground"
                : "border border-b-0 border-border bg-card text-muted-foreground hover:border-primary"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {lockedRestaurantId && (
            <div className="inline-flex rounded-xl border border-border bg-card p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                aria-pressed={viewMode === "list"}
                aria-label={t("cardapio.viewList")}
                className={`grid h-8 w-8 place-items-center rounded-lg transition-colors ${
                  viewMode === "list"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <List className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("card")}
                aria-pressed={viewMode === "card"}
                aria-label={t("cardapio.viewCard")}
                className={`grid h-8 w-8 place-items-center rounded-lg transition-colors ${
                  viewMode === "card"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            {resultCount} {t("cardapio.results")}
          </p>
        </div>
        {!lockedRestaurantId && (
          <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
            <SelectTrigger className="w-48 rounded-xl" aria-label={t("common.sortLabel")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {visibleSortOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {t(opt.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {lockedRestaurantId && viewMode === "list" ? (
        <div className="mt-4 divide-y divide-border border-y border-border">
          {pageItems.map((item) => (
            <DishListRow key={item.id} item={item} onViewDetail={setDetailItem} />
          ))}
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {isGroupedSearch
            ? pageGroups.map((group) => <DishGroupCard key={group.name} group={group} />)
            : pageItems.map((item) => <DishCard key={item.id} item={item} />)}
        </div>
      )}

      {resultCount === 0 && (
        <p className="card-soft mt-4 p-10 text-center text-sm text-muted-foreground">
          {t("cardapio.noResults")}
        </p>
      )}

      <ListPagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto rounded-[2rem] border-none bg-card p-8">
          <DialogTitle className="font-display text-xl font-bold">
            {t("cardapio.filters")}
          </DialogTitle>

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
            className="mt-4 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            {t("cardapio.seeResults")} {filtered.length} {t("cardapio.results")}
          </button>
        </DialogContent>
      </Dialog>

      {/* Detalhe do prato — só a visão em lista abre por aqui (clicar na
          miniatura); a de cartões já mostra tudo essencial no próprio
          card, o "+" já basta. */}
      <Dialog open={!!detailItem} onOpenChange={(open) => !open && setDetailItem(null)}>
        <DialogContent className="max-w-md rounded-[2rem] border-none bg-card p-6">
          {detailItem && (
            <>
              <div className="relative h-48 w-full overflow-hidden rounded-2xl bg-surface">
                <LazyImage
                  src={detailItem.image}
                  alt={detailItem.name}
                  widths={[448, 640, 896]}
                  sizes="(max-width: 448px) 100vw, 448px"
                  className="h-full w-full object-cover"
                />
              </div>
              <DialogTitle className="mt-4 font-display text-xl font-bold">
                {detailItem.name}
              </DialogTitle>
              <p className="mt-2 text-sm text-muted-foreground">{detailItem.description}</p>
              <p className="mt-3 text-lg font-bold text-primary">{formatKz(detailItem.price)}</p>
              <button
                type="button"
                onClick={() => {
                  addToBill(detailItem.restaurantId, detailItem.id, detailItem.name);
                  setDetailItem(null);
                }}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                {t("common.add")}
              </button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
