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
import { useEffect, useMemo, useState } from "react";
import icon from "@/assets/icon.png";
import { FollowBar } from "@/components/follow-button";
import { LocationMap } from "@/components/location-map";
import { MenuBrowser } from "@/components/menu-browser";
import { ReservationDialog } from "@/components/reservation-dialog";
import { RestaurantRecommendationsDialog } from "@/components/restaurant-recommendations-dialog";
import { PageShell } from "@/components/site-shell";
import { StoryViewer } from "@/components/story-viewer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PROVINCE_CENTERS } from "@/data/restaurant-coordinates";
import { recordProfileView } from "@/data/profile-views-store";
import { useEffectiveStories } from "@/data/use-stories";
import { addressProvince, canDeliverToNeighborhood, getRestaurant } from "@/data/helpers";
import type { RestaurantPackage } from "@/data/types";
import { useReviews } from "@/data/use-reviews";
import { fetchApiRestaurant } from "@/data/api-restaurants";
import { usePublicRestaurantPackages } from "@/data/use-restaurants-query";
import { hasRealBackend } from "@/lib/api-client";
import { useTranslation, type Locale } from "@/i18n";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { viewerKey } from "@/lib/customer";
import { estimateDeliveryMinutes } from "@/lib/delivery-history";
import { formatKz } from "@/lib/format";
import { formatKm } from "@/lib/geo";
import { useLocation } from "@/lib/location";
import { useTravelEstimate, type LatLng } from "@/lib/maps";
import { formatWeeklyHours, isOpenNow, nextOpenAt } from "@/lib/opening-hours";
import { packageTypeIcon } from "@/lib/package-type-icons";
import { useRestaurantStatus } from "@/lib/restaurant-status";
import { isVideoSrc, parseTimeFragment } from "@/lib/video-trim";

export const Route = createFileRoute("/restaurantes_/$id")({
  // Loader assíncrono — TanStack Router já trata isto nativamente (SSR
  // aguarda, cliente mostra `pendingComponent`/suspense). Com backend real,
  // vai buscar à API; sem ele (demo), o mock continua síncrono, só
  // embrulhado numa Promise já resolvida.
  loader: async ({ params }) => {
    const restaurant = hasRealBackend
      ? await fetchApiRestaurant(params.id)
      : getRestaurant(params.id);
    if (!restaurant) throw notFound();
    return restaurant;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? "Restaurante"} — Luku.com` },
      { name: "description", content: loaderData?.description ?? "" },
      { property: "og:title", content: `${loaderData?.name ?? "Restaurante"} — Luku.com` },
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
  const { user } = useAuth();
  const allStories = useEffectiveStories();
  const [reservingOpen, setReservingOpen] = useState(false);
  const [reservingPackage, setReservingPackage] = useState<RestaurantPackage | undefined>(
    undefined,
  );
  const [recommendationsOpen, setRecommendationsOpen] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const { data: restaurantPackages = [] } = usePublicRestaurantPackages(restaurant.id);

  const openReserveTable = () => {
    setReservingPackage(undefined);
    setReservingOpen(true);
  };
  const openReservePackage = (pkg: RestaurantPackage) => {
    setReservingPackage(pkg);
    setReservingOpen(true);
  };

  // "Quem viu o seu perfil" — visitante único, não pageview (ver
  // `recordProfileView`). `user?.name` só entra quando muda para não
  // reabrir a janela de sessão a cada render.
  useEffect(() => {
    recordProfileView(restaurant.id, {
      key: viewerKey(user),
      ...(user?.name ? { name: user.name } : {}),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant.id, user?.name, user?.email, user?.phone]);

  // Avaliações — reativas às deixadas nesta página (evento `luku:menu-changed`).
  const reviews = useReviews(restaurant.id);
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
  const pausedReasonText =
    status.reason === "closed"
      ? t("restaurantDetail.closedNow", { opensAt: status.opensAt ?? "" })
      : t("restaurantDetail.paused");
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
      {/* Fundo de parede do restaurante (`/admin/perfil`) — decorativo e bem
          subtil (opacidade baixa), fixo atrás de tudo (`-z-10`, abaixo do
          z-40 do header/tabbar). Propositadamente ligeiro: o conteúdo da
          página não foi todo pensado para estar sobre uma imagem, por isso
          isto é textura de fundo, não um wallpaper "cheio". */}
      {restaurant.wallpaper && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 bg-cover bg-center opacity-[0.07]"
          style={{ backgroundImage: `url(${restaurant.wallpaper})` }}
        />
      )}
      <div className="relative h-[244px] overflow-hidden sm:h-[308px]">
        <img src={restaurant.coverImage} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        {/* Ancorados nos cantos do hero (não no fluxo com o nome) — um nome
            comprido não fica mais espremido por causa destes selos. */}
        <span className="absolute left-4 top-4 z-10 flex items-center gap-1 whitespace-nowrap rounded-full bg-background/90 px-3 py-1.5 text-xs font-semibold text-foreground backdrop-blur">
          <Star className="h-3.5 w-3.5 fill-star text-star" />
          {restaurant.rating} ({restaurant.reviewCount})
        </span>
        {paused && (
          <div className="absolute right-4 top-4 z-10 flex flex-col items-end gap-1.5">
            <span className="whitespace-nowrap rounded-full bg-background/90 px-3 py-1.5 text-xs font-semibold text-destructive backdrop-blur">
              {pausedReasonText}
            </span>
            <button
              type="button"
              onClick={() => setRecommendationsOpen(true)}
              className="whitespace-nowrap rounded-full bg-background/90 px-3 py-1 text-[11px] font-semibold text-primary backdrop-blur transition-colors hover:bg-background hover:underline"
            >
              {t("restaurantDetail.seeAlternatives")}
            </button>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-4 pb-5 md:px-6">
          <div className="w-full min-w-0">
            <h1 className="font-display text-3xl font-extrabold text-white sm:text-4xl">
              {restaurant.name}
            </h1>
            <p className="mt-1 text-sm text-white/90">{restaurant.cuisine}</p>
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
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-3 md:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <FollowBar
            restaurantId={restaurant.id}
            restaurantName={restaurant.name}
            initialFollowersCount={restaurant.followersCount}
          />
          {!paused && outOfZone && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label={t("restaurantDetail.warningsAria")}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-brand/40 text-brand transition-colors hover:bg-brand/5"
                >
                  <Info className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 rounded-xl border border-border bg-card p-3 text-sm text-foreground">
                {t("restaurantDetail.outOfZone", { province: userProvince ?? "" })}
              </PopoverContent>
            </Popover>
          )}

          <div className="ml-auto flex items-center gap-4">
            {hasMedia && !suspended && (
              <button
                type="button"
                onClick={() => setContentTab(activeTab === "gallery" ? "menu" : "gallery")}
                className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
              >
                {activeTab === "gallery" ? (
                  <Soup className="h-4 w-4" />
                ) : (
                  <Images className="h-4 w-4" />
                )}
                {activeTab === "gallery"
                  ? t("restaurantDetail.viewMenuCta")
                  : t("restaurantDetail.viewGalleryCta")}
              </button>
            )}
            {acceptsReservations && !paused && (
              <button
                type="button"
                onClick={openReserveTable}
                className="flex items-center gap-1.5 rounded-xl border border-primary px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
              >
                <CalendarCheck className="h-4 w-4" />
                {t("restaurantDetail.reserveTable")}
              </button>
            )}
          </div>
        </div>

        <div className="mt-4">
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
                        preload="metadata"
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

        {/* Bairro/distância, "ver no mapa", ETA de entrega e telefone —
            desceram pra depois do cardápio; o hero e a linha logo abaixo
            dele ficam só com avaliação, selo de fechado, galeria/cardápio
            e "Reservar mesa". */}
        <div className="card-soft mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 p-4 text-sm text-muted-foreground sm:p-5">
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
                    {review.reply && (
                      <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-primary">
                          {t("restaurantDetail.ownerReplyLabel", { name: restaurant.name })}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                          {review.reply.text}
                        </p>
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

        {/* Pacotes — última secção da página, só aparece com pelo menos
            uma oferta ativa; cada card já abre a reserva com esse pacote
            pré-selecionado. */}
        {!suspended && restaurantPackages.length > 0 && (
          <div className="mt-6">
            <h2 className="font-display text-lg font-bold text-primary">
              {t("restaurantDetail.packagesTitle")}
            </h2>
            <p className="text-xs text-muted-foreground">{t("restaurantDetail.packagesHint")}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {restaurantPackages.map((pkg) => {
                const Icon = packageTypeIcon(pkg.packageType.icon);
                return (
                  <div key={pkg.id} className="card-soft p-4">
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-foreground">
                          {pkg.title ?? pkg.packageType.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {pkg.packageType.name}
                        </p>
                      </div>
                    </div>
                    {pkg.description && (
                      <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                        {pkg.description}
                      </p>
                    )}
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-primary">{formatKz(pkg.price)}</span>
                      {acceptsReservations && !paused && (
                        <button
                          type="button"
                          onClick={() => openReservePackage(pkg)}
                          className="rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/5"
                        >
                          {t("restaurantDetail.reservePackage")}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <ReservationDialog
        restaurant={restaurant}
        open={reservingOpen}
        onOpenChange={setReservingOpen}
        {...(reservingPackage ? { restaurantPackage: reservingPackage } : {})}
      />
      <RestaurantRecommendationsDialog
        open={recommendationsOpen}
        onOpenChange={setRecommendationsOpen}
        restaurant={restaurant}
        reasonText={pausedReasonText}
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
