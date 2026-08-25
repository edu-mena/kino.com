import { createFileRoute, Link } from "@tanstack/react-router";
import { Bike, CalendarCheck, Heart, MapPin, Search, SlidersHorizontal, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import icon from "@/assets/icon.png";
import { ListPagination } from "@/components/list-pagination";
import { ReservationDialog } from "@/components/reservation-dialog";
import { LocationFilterSelect, matchesLocation } from "@/components/search-filters";
import { PageHeading, PageShell } from "@/components/site-shell";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Restaurant } from "@/data/types";
import { INITIAL_RESTAURANTS } from "@/data/mockData";
import { formatKz } from "@/lib/format";
import { usePreferences } from "@/lib/preferences";
import { useTranslation } from "@/i18n";
import { useDebouncedValue } from "@/lib/use-debounced-value";

export const Route = createFileRoute("/restaurantes")({
  head: () => ({
    meta: [
      { title: "Restaurantes em Luanda — Kino.com" },
      {
        name: "description",
        content:
          "Os restaurantes parceiros do Kino.com em Luanda: grelhados, pizza, cozinha angolana e sobremesas.",
      },
      { property: "og:title", content: "Restaurantes em Luanda — Kino.com" },
      { property: "og:description", content: "Descubra os nossos restaurantes parceiros." },
      { property: "og:image", content: icon },
    ],
  }),
  component: Restaurantes,
});

const priceLevels = [...new Set(INITIAL_RESTAURANTS.map((r) => r.priceLevel))].sort(
  (a, b) => a.length - b.length,
);

const sortOptions = [
  { value: "proximidade", labelKey: "restaurantes.sortProximity" },
  { value: "avaliacao", labelKey: "restaurantes.sortRating" },
  { value: "nome", labelKey: "restaurantes.sortName" },
] as const;

const PAGE_SIZE = 9;

function Restaurantes() {
  const { t } = useTranslation();
  const { isFavoriteRestaurant, toggleFavoriteRestaurant } = usePreferences();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [neighborhood, setNeighborhood] = useState("todos");
  const [priceLevel, setPriceLevel] = useState<string | undefined>(undefined);
  const [deliveryOnly, setDeliveryOnly] = useState(false);
  const [sort, setSort] = useState<(typeof sortOptions)[number]["value"]>("proximidade");
  const [page, setPage] = useState(1);
  const [reservingRestaurant, setReservingRestaurant] = useState<Restaurant | null>(null);

  const filtered = useMemo(() => {
    const list = INITIAL_RESTAURANTS.filter((r) => {
      const byQuery =
        !debouncedQuery ||
        r.name.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        r.cuisine.toLowerCase().includes(debouncedQuery.toLowerCase());
      const byNeighborhood = matchesLocation(r.neighborhood, neighborhood);
      const byPriceLevel = !priceLevel || r.priceLevel === priceLevel;
      const byDelivery = !deliveryOnly || r.isDeliveryAvailable;
      return byQuery && byNeighborhood && byPriceLevel && byDelivery;
    });
    const sorted = [...list];
    if (sort === "proximidade") sorted.sort((a, b) => a.distanceKm - b.distanceKm);
    else if (sort === "avaliacao") sorted.sort((a, b) => b.rating - a.rating);
    else sorted.sort((a, b) => a.name.localeCompare(b.name, "pt"));
    return sorted;
  }, [debouncedQuery, neighborhood, priceLevel, deliveryOnly, sort]);

  const activeExtraFilters =
    (neighborhood !== "todos" ? 1 : 0) + (priceLevel ? 1 : 0) + (deliveryOnly ? 1 : 0);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, neighborhood, priceLevel, deliveryOnly, sort]);

  return (
    <PageShell>
      <PageHeading
        eyebrow={t("restaurantes.eyebrow")}
        title={t("restaurantes.title")}
        description={t("restaurantes.description")}
      />

      <div className="mx-auto mt-8 max-w-6xl px-4 md:px-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-2xl border border-border bg-card p-2">
          <label className="flex min-w-0 items-center gap-2 px-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("restaurantes.searchPlaceholder")}
              className="w-full min-w-0 bg-transparent py-2 text-sm outline-none"
            />
          </label>
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="relative flex shrink-0 items-center gap-1.5 rounded-xl bg-surface px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {t("restaurantes.filters")}
            {activeExtraFilters > 0 && (
              <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-brand-foreground">
                {activeExtraFilters}
              </span>
            )}
          </button>
        </div>

        <div className="mt-5 flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {filtered.length} {t("restaurantes.resultsSuffix")}
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

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pageItems.map((r) => {
            const liked = isFavoriteRestaurant(r.id);
            return (
              <div
                key={r.id}
                className="card-soft group relative overflow-hidden transition-colors hover:border-brand"
              >
                <button
                  type="button"
                  aria-label="Guardar nos favoritos"
                  onClick={(e) => {
                    e.preventDefault();
                    toggleFavoriteRestaurant(r.id);
                  }}
                  className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-background/80 text-muted-foreground backdrop-blur transition-colors hover:text-brand"
                >
                  <Heart className={`h-4 w-4 ${liked ? "fill-brand text-brand" : ""}`} />
                </button>
                <Link to="/restaurantes/$id" params={{ id: r.id }}>
                  <div className="h-40 overflow-hidden bg-surface">
                    <img
                      src={r.coverImage}
                      alt={`Interior do restaurante ${r.name}`}
                      loading="lazy"
                      width={1024}
                      height={768}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                      <h2 className="truncate font-display text-lg font-bold">{r.name}</h2>
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-surface px-2 py-1 text-xs font-bold">
                        <Star className="h-3.5 w-3.5 fill-star text-star" />
                        {r.rating}
                      </span>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {r.cuisine} · {r.priceLevel}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {r.distanceKm} km
                      </span>
                      {r.isDeliveryAvailable ? (
                        <span className="flex items-center gap-1">
                          <Bike className="h-3.5 w-3.5" />
                          {r.estimatedDeliveryMinutes} min · {formatKz(r.deliveryFee)}
                        </span>
                      ) : (
                        <span>{t("restaurantes.noDelivery")}</span>
                      )}
                    </div>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => setReservingRestaurant(r)}
                  className="flex w-full items-center justify-center gap-1.5 border-t border-border py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
                >
                  <CalendarCheck className="h-4 w-4" />
                  {t("restaurantes.reserveTable")}
                </button>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <p className="card-soft mt-4 p-10 text-center text-sm text-muted-foreground">
            {t("restaurantes.noResults")}
          </p>
        )}

        <ListPagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto rounded-[2rem] border-none bg-card p-8">
          <DialogTitle className="font-display text-xl font-bold">
            {t("restaurantes.filters")}
          </DialogTitle>

          <div className="mt-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {t("cardapio.location")}
            </p>
            <LocationFilterSelect value={neighborhood} onChange={setNeighborhood} />
          </div>

          <div className="mt-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {t("restaurantes.priceLevel")}
            </p>
            <ToggleGroup
              type="single"
              value={priceLevel ?? ""}
              onValueChange={(v) => setPriceLevel(v || undefined)}
              className="flex-wrap justify-start"
            >
              {priceLevels.map((level) => (
                <ToggleGroupItem
                  key={level}
                  value={level}
                  className="rounded-full border border-border"
                >
                  {level}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <label className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-border p-3">
            <span className="text-sm font-medium">{t("restaurantes.deliveryOnly")}</span>
            <input
              type="checkbox"
              checked={deliveryOnly}
              onChange={(e) => setDeliveryOnly(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
          </label>

          <button
            type="button"
            onClick={() => setFiltersOpen(false)}
            className="mt-6 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            {t("restaurantes.seeRestaurants")} {filtered.length} {t("restaurantes.resultsSuffix")}
          </button>
        </DialogContent>
      </Dialog>

      {reservingRestaurant && (
        <ReservationDialog
          restaurant={reservingRestaurant}
          open={!!reservingRestaurant}
          onOpenChange={(open) => !open && setReservingRestaurant(null)}
        />
      )}
    </PageShell>
  );
}
