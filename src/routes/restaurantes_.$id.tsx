import { createFileRoute, notFound } from "@tanstack/react-router";
import {
  Bike,
  CalendarCheck,
  CirclePlay,
  Clock,
  Images,
  Info,
  MapPin,
  Phone,
  Star,
  Soup,
} from "lucide-react";
import { useEffect, useMemo, useReducer, useState } from "react";
import icon from "@/assets/icon.png";
import { LocationMap } from "@/components/location-map";
import { MenuBrowser } from "@/components/menu-browser";
import { ReservationDialog } from "@/components/reservation-dialog";
import { PageShell } from "@/components/site-shell";
import { StoryViewer } from "@/components/story-viewer";
import { PROVINCE_CENTERS } from "@/data/restaurant-coordinates";
import { useEffectiveStories } from "@/data/use-stories";
import {
  addressProvince,
  canDeliverToNeighborhood,
  getRestaurant,
  getReviewsForRestaurant,
} from "@/data/helpers";
import { useTranslation, type Locale } from "@/i18n";
import { useCart } from "@/lib/cart";
import { estimateDeliveryMinutes } from "@/lib/delivery-history";
import { formatKz } from "@/lib/format";
import { formatKm } from "@/lib/geo";
import { useLocation } from "@/lib/location";
import { useTravelEstimate, type LatLng } from "@/lib/maps";
import { formatWeeklyHours, isOpenNow, nextOpenAt } from "@/lib/opening-hours";
import { useRestaurantStatus } from "@/lib/restaurant-status";
import { isVideoSrc, parseTimeFragment } from "@/lib/video-trim";

export const Route = createFileRoute("/restaurantes_/$id")({
  loader: ({ params }) => {
    const restaurant = getRestaurant(params.id);
    if (!restaurant) throw notFound();
    return restaurant;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? "Restaurante"} — Kino.com` },
      { name: "description", content: loaderData?.description ?? "" },
      { property: "og:title", content: `${loaderData?.name ?? "Restaurante"} — Kino.com` },
      { property: "og:image", content: icon },
    ],
  }),
  component: RestaurantDetail,
});

const BCP47: Record<Locale, string> = { pt: "pt-PT", en: "en-GB", fr: "fr-FR" };

function RestaurantDetail() {
  const restaurant = Route.useLoaderData();
  const { t, locale } = useTranslation();
  const { selected: userLocation } = useLocation();
  const status = useRestaurantStatus(restaurant.id);
  const { orders } = useCart();
  const allStories = useEffectiveStories();
  const [reservingOpen, setReservingOpen] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  // Avaliações — reativas às deixadas nesta página (evento `kino:menu-changed`).
  const [reviewsTick, bumpReviews] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    window.addEventListener("kino:menu-changed", bumpReviews);
    window.addEventListener("storage", bumpReviews);
    return () => {
      window.removeEventListener("kino:menu-changed", bumpReviews);
      window.removeEventListener("storage", bumpReviews);
    };
  }, []);
  const reviews = useMemo(
    () => getReviewsForRestaurant(restaurant.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `reviewsTick` não é lido; força recalcular quando o store muda.
    [restaurant.id, reviewsTick],
  );
  const shownReviews = showAllReviews ? reviews : reviews.slice(0, 6);
  const [contentTab, setContentTab] = useState<"menu" | "gallery">("menu");

  const restaurantStories = allStories.filter((s) => s.restaurantId === restaurant.id);
  const hasStories = restaurantStories.length > 0;

  // Galeria: fotos/vídeos do perfil + stories (imagem/vídeo) ainda dentro das
  // 24h. A aba só aparece se houver algo.
  const mediaItems = [
    ...restaurant.galleryImages
      .filter((src) => src.trim())
      .map((src) => ({
        key: `g:${src}`,
        type: (isVideoSrc(src) ? "video" : "image") as "image" | "video",
        src,
      })),
    ...restaurantStories.map((s) => ({
      key: `s:${s.id}`,
      type: (s.mediaType ?? "image") as "image" | "video",
      src: s.image,
    })),
  ];
  const hasMedia = mediaItems.length > 0;
  const activeTab = hasMedia ? contentTab : "menu";

  const paused = !status.available;
  const suspended = status.reason === "suspended";
  const acceptsReservations = restaurant.acceptsReservations ?? true;
  const userProvince = userLocation ? addressProvince(userLocation.line2) : undefined;
  const outOfZone =
    restaurant.isDeliveryAvailable &&
    !!userProvince &&
    !canDeliverToNeighborhood(restaurant, userProvince);

  // Ponto do cliente: coordenadas da morada quando existem (geocoding),
  // senão o centro da província da morada selecionada. O ponto do
  // restaurante vem de `lat/lng` (afinável em `/admin/perfil`).
  const userPoint = useMemo<LatLng | null>(() => {
    if (userLocation?.lat != null && userLocation?.lng != null) {
      return { lat: userLocation.lat, lng: userLocation.lng };
    }
    const c = userProvince ? PROVINCE_CENTERS[userProvince] : undefined;
    return c ? { lat: c.lat, lng: c.lng } : null;
  }, [userLocation?.lat, userLocation?.lng, userProvince]);
  const restaurantPoint =
    restaurant.lat != null && restaurant.lng != null
      ? { lat: restaurant.lat, lng: restaurant.lng }
      : null;

  // Distância atrás do contrato `@/lib/maps`: hoje é haversine (aproximada);
  // com `VITE_MAPS_PROVIDER=google` + backend passa a distância de rota real.
  const travel = useTravelEstimate(restaurantPoint, userPoint);
  const distanceKm = travel.result?.distanceKm ?? null;

  // Tempo de entrega estimado a partir do histórico de entregas do
  // restaurante (faixa horária atual), com recuo para o valor do perfil.
  // TODO(maps): quando `travel.result` for rota real (`!approximate`),
  // compor o ETA com `durationInTrafficMin` em vez de usar só o histórico.
  const deliveryEst = restaurant.isDeliveryAvailable
    ? estimateDeliveryMinutes(
        orders,
        restaurant.id,
        restaurant.estimatedDeliveryMinutes,
        new Date(),
      )
    : null;

  return (
    <PageShell>
      <div className="relative h-56 overflow-hidden sm:h-72">
        <img src={restaurant.coverImage} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 mx-auto flex max-w-6xl items-end justify-between gap-3 px-4 pb-5 md:px-6">
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-extrabold text-white sm:text-4xl">
              {restaurant.name}
            </h1>
            <p className="mt-1 text-sm text-white/90">
              {restaurant.cuisine} · {restaurant.priceLevel}
            </p>
            {hasStories && !suspended && (
              <button
                type="button"
                onClick={() => setStoryOpen(true)}
                className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-1.5 text-xs font-bold text-primary shadow-sm backdrop-blur transition-colors hover:bg-white"
              >
                <CirclePlay className="h-4 w-4" />
                {t("restaurantDetail.viewStory")}
              </button>
            )}
          </div>
          {paused && (
            <span className="max-w-[55%] shrink-0 rounded-full bg-background/90 px-3 py-1.5 text-right text-xs font-semibold text-destructive backdrop-blur">
              {status.reason === "closed"
                ? t("restaurantDetail.closedNow", { opensAt: status.opensAt ?? "" })
                : t("restaurantDetail.paused")}
            </span>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-6 md:px-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1 font-semibold text-foreground">
            <Star className="h-4 w-4 fill-star text-star" />
            {restaurant.rating} ({restaurant.reviewCount})
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {restaurant.neighborhood}
            {distanceKm != null && ` · ${formatKm(distanceKm)} km`}
          </span>
          <a
            href="#localizacao"
            className="flex items-center gap-1 font-semibold text-primary hover:underline"
          >
            <MapPin className="h-4 w-4" />
            {t("restaurantDetail.viewOnMap")}
          </a>
          {restaurant.isDeliveryAvailable && deliveryEst && (
            <span
              className="flex items-center gap-1"
              title={
                deliveryEst.basedOnHistory
                  ? t("restaurantDetail.etaFromHistory", { count: deliveryEst.sampleCount })
                  : undefined
              }
            >
              <Bike className="h-4 w-4" />
              {t("restaurantDetail.etaMinutes", { min: deliveryEst.minutes })} ·{" "}
              {t("restaurantDetail.deliveryFeeFrom", { fee: formatKz(restaurant.deliveryFee) })}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Phone className="h-4 w-4" />
            {restaurant.phone}
          </span>
          {acceptsReservations && !paused && (
            <button
              type="button"
              onClick={() => setReservingOpen(true)}
              className="ml-auto flex items-center gap-1.5 rounded-xl border border-primary px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
            >
              <CalendarCheck className="h-4 w-4" />
              {t("restaurantDetail.reserveTable")}
            </button>
          )}
        </div>

        {!paused && outOfZone && (
          <p className="mt-4 flex items-start gap-2 rounded-xl border border-brand/30 bg-brand/5 p-3 text-sm text-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
            {t("restaurantDetail.outOfZone", { province: userProvince ?? "" })}
          </p>
        )}

        <div className="mt-8">
          {suspended ? (
            <div className="card-soft grid place-items-center gap-2 p-10 text-center">
              <Info className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">
                {t("restaurantDetail.suspendedTitle")}
              </p>
              <p className="max-w-sm text-xs text-muted-foreground">
                {t("restaurantDetail.suspendedNotice")}
              </p>
            </div>
          ) : (
            <>
              {hasMedia && (
                <div className="mb-5 inline-flex rounded-xl border border-border bg-card p-0.5 text-sm font-semibold">
                  {(["menu", "gallery"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setContentTab(tab)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 transition-colors ${
                        activeTab === tab
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tab === "menu" ? (
                        <Soup className="h-4 w-4" />
                      ) : (
                        <Images className="h-4 w-4" />
                      )}
                      {t(
                        tab === "menu" ? "restaurantDetail.tabMenu" : "restaurantDetail.tabGallery",
                      )}
                    </button>
                  ))}
                </div>
              )}

              {activeTab === "menu" ? (
                <MenuBrowser lockedRestaurantId={restaurant.id} />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {mediaItems.map((m) => {
                    const frag = parseTimeFragment(m.src);
                    return m.type === "video" ? (
                      <video
                        key={m.key}
                        src={m.src}
                        controls
                        playsInline
                        onLoadedMetadata={
                          frag
                            ? (e) => {
                                e.currentTarget.currentTime = frag.start;
                              }
                            : undefined
                        }
                        className="aspect-video w-full rounded-xl border border-border bg-surface object-cover"
                      />
                    ) : (
                      <img
                        key={m.key}
                        src={m.src}
                        alt={t("restaurantDetail.tabGallery")}
                        loading="lazy"
                        className="aspect-video w-full rounded-xl border border-border bg-surface object-cover"
                      />
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        <section className="mt-10">
          <h2 className="font-display text-lg font-bold text-foreground">
            {t("restaurantDetail.aboutTitle")}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{restaurant.description}</p>
        </section>

        <section id="avaliacoes" className="mt-10 scroll-mt-24">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <h2 className="font-display text-lg font-bold text-foreground">
              {t("restaurantDetail.reviewsTitle")}
            </h2>
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Star className="h-4 w-4 fill-star text-star" />
              <span className="font-semibold text-foreground">{restaurant.rating}</span>·{" "}
              {t("restaurantDetail.reviewsCount", { count: restaurant.reviewCount })}
            </span>
          </div>

          {shownReviews.length === 0 ? (
            <div className="mt-3 rounded-xl border border-border bg-surface p-5 text-center">
              <p className="text-sm text-muted-foreground">{t("restaurantDetail.reviewsEmpty")}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("restaurantDetail.reviewsAfterOrder")}
              </p>
            </div>
          ) : (
            <>
              <div className="mt-4 space-y-3">
                {shownReviews.map((review) => (
                  <div key={review.id} className="card-soft p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-display text-sm font-bold text-foreground">
                        {review.customerName}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3.5 w-3.5 ${
                                i < review.rating ? "fill-star text-star" : "text-border"
                              }`}
                            />
                          ))}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(`${review.date}T12:00:00`).toLocaleDateString(BCP47[locale], {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                    {review.comment && (
                      <p className="mt-3 text-sm text-muted-foreground">{review.comment}</p>
                    )}
                    {review.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {review.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-surface px-3 py-1 text-xs font-medium text-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {reviews.length > 6 && (
                <button
                  type="button"
                  onClick={() => setShowAllReviews((v) => !v)}
                  className="mt-4 text-sm font-semibold text-primary hover:underline"
                >
                  {showAllReviews
                    ? t("restaurantDetail.reviewsLess")
                    : t("restaurantDetail.reviewsMore", { count: reviews.length - 6 })}
                </button>
              )}
            </>
          )}
        </section>

        {restaurant.hours && (
          <section className="card-soft mt-6 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                <Clock className="h-4 w-4 text-primary" />
                {t("restaurantDetail.hoursTitle")}
              </h2>
              {(() => {
                const open = isOpenNow(restaurant.hours);
                if (open) {
                  return (
                    <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-bold text-success">
                      {t("restaurantDetail.openNowShort")}
                    </span>
                  );
                }
                const next = nextOpenAt(restaurant.hours, locale);
                return (
                  <span className="rounded-full bg-muted-foreground/15 px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
                    {next
                      ? t("restaurantDetail.closedNowShort", { opensAt: next })
                      : t("restaurantDetail.closedNowNoNext")}
                  </span>
                );
              })()}
            </div>
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              {formatWeeklyHours(restaurant.hours, locale)
                .split(" · ")
                .map((row) => (
                  <li key={row}>{row}</li>
                ))}
            </ul>
          </section>
        )}

        <section id="localizacao" className="card-soft mt-6 scroll-mt-24 p-4 sm:p-5">
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            {t("restaurantDetail.locationTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{restaurant.address}</p>
          {restaurant.lat != null && restaurant.lng != null && (
            <LocationMap
              className="mt-3"
              height={320}
              enableLocate
              scrollWheelZoom
              points={[
                {
                  id: restaurant.id,
                  lat: restaurant.lat,
                  lng: restaurant.lng,
                  label: restaurant.name,
                },
              ]}
            />
          )}
        </section>
      </div>

      <ReservationDialog
        restaurant={restaurant}
        open={reservingOpen}
        onOpenChange={setReservingOpen}
      />
      {storyOpen && (
        <StoryViewer
          restaurants={[restaurant]}
          startIndex={0}
          onClose={() => setStoryOpen(false)}
        />
      )}
    </PageShell>
  );
}
