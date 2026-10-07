import { Link } from "@tanstack/react-router";
import {
  ChevronDown,
  ChevronRight,
  MapPin,
  Search,
  SlidersHorizontal,
  Star,
  Store,
  UtensilsCrossed,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { DietaryShortcutPicker } from "@/components/dietary-shortcut-picker";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LocationFilterSelect, matchesLocation } from "@/components/search-filters";
import { addressProvince, getRestaurant, visibleToCustomers } from "@/data/helpers";
import { useLiveCatalogVersion } from "@/data/live-catalog";
import type { MenuItem, Restaurant } from "@/data/types";
import { useMenuItems } from "@/data/use-menu-items";
import { useCustomerRestaurants, useRestaurantServerSearch } from "@/data/use-restaurants-query";
import { formatKz } from "@/lib/format";
import { groupMenuItemsByName, type DishGroup } from "@/lib/group-dishes-by-name";
import { useLocation } from "@/lib/location";
import { useTranslation } from "@/i18n";
import { useDebouncedValue } from "@/lib/use-debounced-value";

/** Insere `extra` como 3º elemento de `rows` (ou no fim, se `rows` tiver
 * menos de 2) — usado para o atalho de restrição alimentar aparecer como
 * 3º item dentro da lista de pratos, sem depender de quantos resultados
 * existem. */
function insertAsThird(rows: ReactNode[], extra: ReactNode): ReactNode[] {
  const result = [...rows];
  result.splice(Math.min(2, result.length), 0, extra);
  return result;
}

/** O que a pesquisa mostra — pratos OU restaurantes, nunca os dois juntos
 * (antes misturava-os, e os restaurantes vinham do mock: ids falsos que
 * davam 404 ao abrir). */
type SearchMode = "dishes" | "restaurants";

export function HeaderSearch() {
  const { t } = useTranslation();
  const { items } = useMenuItems();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<SearchMode>("dishes");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  // Restaurantes reais (API), mais o que só a pesquisa no servidor encontra
  // (o restaurante de demonstração dos revisores, pelo nome exato).
  // Sem restaurantes inativos (subscrição suspensa) — nem os da lista,
  // nem os que a pesquisa no servidor encontra pelo nome.
  const { data: listedRestaurants = [] } = useCustomerRestaurants();
  const { data: serverMatches = [] } = useRestaurantServerSearch(debouncedQuery);
  const restaurants = useMemo(() => {
    const known = new Set(listedRestaurants.map((r) => r.id));
    return [
      ...listedRestaurants,
      ...visibleToCustomers(serverMatches).filter((r) => !known.has(r.id)),
    ];
  }, [listedRestaurants, serverMatches]);
  // `getRestaurant()` (nome/zona do restaurante de cada prato) lê o catálogo
  // real — redesenha quando ele chega.
  const catalogVersion = useLiveCatalogVersion();
  const categories = useMemo(() => [...new Set(items.map((m) => m.category))], [items]);
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [neighborhood, setNeighborhood] = useState<string>("todos");
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const { selected: userAddress } = useLocation();
  const myProvince = userAddress ? addressProvince(userAddress.line2) : undefined;

  const overallMaxPrice = useMemo(
    () => (items.length ? Math.max(...items.map((m) => m.price ?? 0)) : 0),
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
      const byNeighborhood = matchesLocation(restaurant?.neighborhood, neighborhood, myProvince);
      return byQuery && byCategory && byNeighborhood;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- catalogVersion: getRestaurant() lê o catálogo real, que chega depois
  }, [items, debouncedQuery, category, neighborhood, myProvince, catalogVersion]);

  const maxAvailablePrice = filteredExceptPrice.length
    ? Math.max(...filteredExceptPrice.map((m) => m.price ?? 0))
    : overallMaxPrice;

  // Sem toque manual, a faixa de preço segue o mais caro entre os
  // resultados já filtrados pelos outros critérios. Uma vez tocada, o
  // valor escolhido persiste, só sendo limitado se o teto disponível cair.
  useEffect(() => {
    setMaxPrice((prev) => (priceTouched ? Math.min(prev, maxAvailablePrice) : maxAvailablePrice));
  }, [maxAvailablePrice, priceTouched]);

  const filtered = useMemo(
    () => filteredExceptPrice.filter((item) => item.isBuffetOnly || (item.price ?? 0) <= maxPrice),
    [filteredExceptPrice, maxPrice],
  );

  // Restaurantes correspondem por nome/cozinha e localização — categoria
  // e preço são atributos do prato, não fazem sentido aqui. Sem texto,
  // mostra todos os da zona escolhida.
  const matchedRestaurants = useMemo(() => {
    const q = debouncedQuery.toLowerCase();
    return restaurants.filter((r) => {
      const byQuery = !q || r.name.toLowerCase().includes(q) || r.cuisine.toLowerCase().includes(q);
      const byNeighborhood = matchesLocation(r.neighborhood, neighborhood, myProvince);
      return byQuery && byNeighborhood;
    });
  }, [restaurants, debouncedQuery, neighborhood, myProvince]);

  // Agrupa por nome do prato só quando há texto pesquisado — clicar leva
  // pra `/pratos/$dishName` (visão geral, com faixa de preço e lista de
  // restaurantes) em vez de já ir direto ao prato de um restaurante.
  const dishGroups = useMemo(
    () => (debouncedQuery ? groupMenuItemsByName(filtered) : []),
    [debouncedQuery, filtered],
  );

  const dishCount = debouncedQuery ? dishGroups.length : filtered.length;
  const totalResults = mode === "dishes" ? dishCount : matchedRestaurants.length;
  // Preço e categoria são filtros de prato — no modo restaurantes só conta
  // (e só aparece) a localização.
  const activeFilterCount =
    (neighborhood !== "todos" ? 1 : 0) +
    (mode === "dishes"
      ? (category ? 1 : 0) + (priceTouched && maxPrice < overallMaxPrice ? 1 : 0)
      : 0);

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

          <div
            role="tablist"
            aria-label={t("search.modeLabel")}
            className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-surface p-1"
          >
            {(
              [
                ["dishes", UtensilsCrossed, t("search.dishesLabel"), dishCount],
                ["restaurants", Store, t("search.restaurantsLabel"), matchedRestaurants.length],
              ] as const
            ).map(([value, Icon, label, count]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={mode === value}
                onClick={() => setMode(value)}
                className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                  mode === value
                    ? "bg-card text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                <span className="font-semibold opacity-60">{count}</span>
              </button>
            ))}
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
              {mode === "dishes" && (
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
              )}

              <div className="min-w-0">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {t("search.location")}
                </p>
                <LocationFilterSelect value={neighborhood} onChange={setNeighborhood} />
              </div>

              {mode === "dishes" && (
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
              )}
            </div>
          )}

          <div className="mt-2 min-w-0 border-t border-border pt-2">
            <p className="text-xs font-semibold text-muted-foreground">
              {t("search.resultsCount", { count: totalResults })}
            </p>

            <div className="mt-3 max-h-80 space-y-5 overflow-y-auto">
              {mode === "restaurants" && matchedRestaurants.length > 0 && (
                <div className="space-y-2">
                  {matchedRestaurants.map((restaurant) => (
                    <RestaurantResultRow
                      key={restaurant.id}
                      restaurant={restaurant}
                      onSelect={() => setOpen(false)}
                    />
                  ))}
                </div>
              )}

              {mode === "dishes" &&
                (debouncedQuery
                  ? dishGroups.length > 0 && (
                      <div className="space-y-2">
                        {/* 3º elemento da lista de pratos: atalho de restrição
                          alimentar — some sozinho assim que o usuário já
                          tiver escolhido uma (ver DietaryShortcutPicker). */}
                        {insertAsThird(
                          dishGroups.map((group) => (
                            <DishGroupResultRow
                              key={group.name}
                              group={group}
                              onSelect={() => setOpen(false)}
                            />
                          )),
                          <DietaryShortcutPicker
                            key="dietary-shortcut"
                            ctaLabel={t("search.dietaryCta")}
                            onNavigate={() => setOpen(false)}
                          />,
                        )}
                      </div>
                    )
                  : filtered.length > 0 && (
                      <div className="space-y-2">
                        {insertAsThird(
                          filtered.map((item) => (
                            <SearchResultRow
                              key={item.id}
                              item={item}
                              onSelect={() => setOpen(false)}
                            />
                          )),
                          <DietaryShortcutPicker
                            key="dietary-shortcut"
                            ctaLabel={t("search.dietaryCta")}
                            onNavigate={() => setOpen(false)}
                          />,
                        )}
                      </div>
                    ))}

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
  const { t } = useTranslation();
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
      <span className="shrink-0 text-sm font-bold text-primary">
        {item.isBuffetOnly ? t("dishCard.buffetIncluded") : formatKz(item.price ?? 0)}
      </span>
    </Link>
  );
}

function DishGroupResultRow({ group, onSelect }: { group: DishGroup; onSelect: () => void }) {
  const { t } = useTranslation();
  const prices = group.items.map((i) => i.price).filter((p): p is number => p != null);
  const minPrice = prices.length ? Math.min(...prices) : null;
  const maxPrice = prices.length ? Math.max(...prices) : null;
  const firstItem = group.items[0]!;

  return (
    <Link
      to="/pratos/$dishName"
      params={{ dishName: group.name }}
      onClick={onSelect}
      className="flex items-center gap-3 rounded-xl border border-transparent p-2 transition-colors hover:border-brand hover:bg-brand/5"
    >
      <img
        src={firstItem.image}
        alt=""
        className="h-12 w-12 shrink-0 rounded-xl bg-surface object-contain"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{group.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {group.items.length > 1
            ? `${group.items.length} restaurantes`
            : (getRestaurant(firstItem.restaurantId)?.name ?? "")}
        </p>
      </div>
      <span className="shrink-0 text-sm font-bold text-primary">
        {minPrice == null
          ? t("dishCard.buffetIncluded")
          : minPrice === maxPrice
            ? formatKz(minPrice)
            : `Desde ${formatKz(minPrice)}`}
      </span>
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
