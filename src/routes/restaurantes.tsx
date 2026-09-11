import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Bike,
  CalendarCheck,
  Heart,
  LayoutGrid,
  Map as MapIcon,
  MapPin,
  Search,
  SlidersHorizontal,
  Star,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import icon from "@/assets/icon.png";
import { LazyImage } from "@/components/lazy-image";
import { LocationMap } from "@/components/location-map";
import { ListPagination } from "@/components/list-pagination";
import { ReservationDialog } from "@/components/reservation-dialog";
import { LocationFilterSelect, matchesLocation } from "@/components/search-filters";
import { PageShell } from "@/components/site-shell";
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
import { getAllRestaurants } from "@/data/helpers";
import { PROVINCE_CENTERS } from "@/data/restaurant-coordinates";
import { personalizedRestaurantDistanceKm } from "@/lib/delivery-eval";
import { formatKz } from "@/lib/format";
import { haversineKm } from "@/lib/geo";
import { useLocation } from "@/lib/location";
import { PRICE_TIER_LABELS } from "@/lib/price-level";
import { usePreferences } from "@/lib/preferences";
import { computeRestaurantStatus } from "@/lib/restaurant-status";
import { useSubscriptions } from "@/lib/subscriptions";
import { useTranslation } from "@/i18n";
import { useDebouncedValue } from "@/lib/use-debounced-value";

export const Route = createFileRoute("/restaurantes")({
  head: () => ({
    meta: [
      { title: "Restaurantes em Luanda — Luku.com" },
      {
        name: "description",
        content:
          "Os restaurantes parceiros do Luku.com em Luanda: grelhados, pizza, cozinha angolana e sobremesas.",
      },
      { property: "og:title", content: "Restaurantes em Luanda — Luku.com" },
      { property: "og:description", content: "Descubra os nossos restaurantes parceiros." },
      { property: "og:image", content: icon },
    ],
  }),
  component: Restaurantes,
});

const priceLevels = [...PRICE_TIER_LABELS];

const sortOptions = [
  { value: "proximidade", labelKey: "restaurantes.sortProximity" },
  { value: "avaliacao", labelKey: "restaurantes.sortRating" },
  { value: "nome", labelKey: "restaurantes.sortName" },
] as const;

const PAGE_SIZE = 9;
const VIEW_KEY = "luku_restaurantes_view";

function Restaurantes() {
  const { t, locale } = useTranslation();
  const navigate = useNavigate();
  const { isFavoriteRestaurant, toggleFavoriteRestaurant } = usePreferences();
  const { byRestaurant: subByRestaurant } = useSubscriptions();
  // Morada selecionada no chip do header — dá uma distância "real" (por
  // usuário) em vez do `distanceKm` fixo da seed, igual pra toda a gente.
  // Com a localização exata do dispositivo (`deviceCoords`, autorizada no
  // botão abaixo), a distância passa a ser a real (haversine), não a
  // aproximação por morada.
  const {
    selected: selectedAddress,
    deviceCoords,
    deviceLocationStatus,
    requestDeviceLocation,
  } = useLocation();
  const distanceKm = (r: Restaurant) => {
    if (deviceCoords && r.lat != null && r.lng != null) {
      return Math.round(haversineKm(deviceCoords, [r.lat, r.lng]) * 10) / 10;
    }
    return personalizedRestaurantDistanceKm(r.id, selectedAddress, r.distanceKm);
  };
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [neighborhood, setNeighborhood] = useState("todos");
  const [priceLevel, setPriceLevel] = useState<string | undefined>(undefined);
  const [deliveryOnly, setDeliveryOnly] = useState(false);
  const [sort, setSort] = useState<(typeof sortOptions)[number]["value"]>("proximidade");
  const [page, setPage] = useState(1);
  const [reservingRestaurant, setReservingRestaurant] = useState<Restaurant | null>(null);
  const [view, setView] = useState<"grid" | "map">("grid");

  useEffect(() => {
    try {
      if (localStorage.getItem(VIEW_KEY) === "map") setView("map");
    } catch {
      /* localStorage indisponível — fica em grelha */
    }
  }, []);

  const changeView = (next: "grid" | "map") => {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      /* ignore */
    }
  };

  const filtered = useMemo(() => {
    const list = getAllRestaurants().filter((r) => {
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
    if (sort === "proximidade") sorted.sort((a, b) => distanceKm(a) - distanceKm(b));
    else if (sort === "avaliacao") sorted.sort((a, b) => b.rating - a.rating);
    else sorted.sort((a, b) => a.name.localeCompare(b.name, "pt"));
    // Fechados não interessam agora — ficam sempre depois dos abertos,
    // qualquer que seja o critério de ordenação escolhido acima (a ordem
    // dentro de cada grupo é preservada, `sort` é estável).
    const isPaused = (r: Restaurant) =>
      !computeRestaurantStatus(r, subByRestaurant(r.id)?.status, locale).available;
    sorted.sort((a, b) => Number(isPaused(a)) - Number(isPaused(b)));
    return sorted;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `distanceKm`/`isPaused` são recriadas a cada render, mas só mudam de resultado quando `selectedAddress`/`deviceCoords`/`subByRestaurant`/`locale` mudam.
  }, [
    debouncedQuery,
    neighborhood,
    priceLevel,
    deliveryOnly,
    sort,
    selectedAddress,
    deviceCoords,
    subByRestaurant,
    locale,
  ]);

  const activeExtraFilters =
    (neighborhood !== "todos" ? 1 : 0) + (priceLevel ? 1 : 0) + (deliveryOnly ? 1 : 0);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, neighborhood, priceLevel, deliveryOnly, sort]);

  return (
    <PageShell>
      <div className="mx-auto mt-6 max-w-6xl px-4 md:px-6">
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

        {/* Sem localização exata do dispositivo ainda — pede de forma
            apelativa em vez de nunca oferecer: sem isto, "perto de si" só
            usa a morada guardada (aproximada) ou o valor fixo da seed. */}
        {deviceLocationStatus !== "granted" && deviceLocationStatus !== "unsupported" && (
          <button
            type="button"
            onClick={requestDeviceLocation}
            disabled={deviceLocationStatus === "loading"}
            className="mt-3 flex w-full items-center gap-2.5 rounded-xl border border-dashed border-brand/40 bg-brand/5 px-4 py-3 text-left transition-colors hover:border-brand disabled:opacity-70"
          >
            <MapPin className="h-4 w-4 shrink-0 text-brand" />
            <span className="min-w-0 flex-1 text-xs font-semibold text-brand">
              {deviceLocationStatus === "loading"
                ? t("restaurantes.locateLoading")
                : deviceLocationStatus === "denied"
                  ? t("restaurantes.locateDenied")
                  : t("restaurantes.locateCta")}
            </span>
          </button>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {filtered.length} {t("restaurantes.resultsSuffix")}
          </p>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl border border-border bg-card p-0.5">
              <button
                type="button"
                onClick={() => changeView("grid")}
                aria-pressed={view === "grid"}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  view === "grid"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                {t("restaurantes.viewGrid")}
              </button>
              <button
                type="button"
                onClick={() => changeView("map")}
                aria-pressed={view === "map"}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  view === "map"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <MapIcon className="h-3.5 w-3.5" />
                {t("restaurantes.viewMap")}
              </button>
            </div>
            <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
              <SelectTrigger className="w-44 rounded-xl" aria-label={t("common.sortLabel")}>
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
        </div>

        {view === "map" &&
          (() => {
            // Filtrado a uma província: abre centrado nela (zoom de cidade).
            // Caso contrário, ajusta a vista a todos os pontos.
            const province = PROVINCE_CENTERS[neighborhood];
            return (
              <LocationMap
                className="mt-4"
                height={520}
                points={filtered
                  .filter((r) => r.lat != null && r.lng != null)
                  .map((r) => ({ id: r.id, lat: r.lat!, lng: r.lng!, label: r.name }))}
                {...(province
                  ? { initialView: { lat: province.lat, lng: province.lng, zoom: 10 } }
                  : {})}
                onSelectPoint={(id) => navigate({ to: "/restaurantes/$id", params: { id } })}
              />
            );
          })()}

        <div
          className={`mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${view === "map" ? "hidden" : ""}`}
        >
          {pageItems.map((r) => {
            const liked = isFavoriteRestaurant(r.id);
            const rStatus = computeRestaurantStatus(r, subByRestaurant(r.id)?.status, locale);
            const paused = !rStatus.available;
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
                  <div className="relative h-40 overflow-hidden bg-surface">
                    <LazyImage
                      src={r.coverImage}
                      alt={`Interior do restaurante ${r.name}`}
                      width={1024}
                      height={768}
                      widths={[400, 640, 800]}
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {paused && (
                      <span className="absolute bottom-2 right-2 rounded-md bg-destructive px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-destructive-foreground">
                        {rStatus.reason === "closed"
                          ? t("restaurantes.closedNow")
                          : t("restaurantes.temporarilyUnavailable")}
                      </span>
                    )}
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
                        {distanceKm(r)} km
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

        {view === "grid" && (
          <ListPagination page={page} totalPages={totalPages} onPageChange={setPage} />
        )}
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
