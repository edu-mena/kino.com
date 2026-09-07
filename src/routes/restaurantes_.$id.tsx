import { createFileRoute, notFound } from "@tanstack/react-router";
import {
  Bike,
  CalendarCheck,
  CirclePlay,
  Images,
  Info,
  MapPin,
  Phone,
  Star,
  PenLine,
  Soup,
} from "lucide-react";
import { useState } from "react";
import icon from "@/assets/icon.png";
import { LocationMap } from "@/components/location-map";
import { MenuBrowser } from "@/components/menu-browser";
import { ReservationDialog } from "@/components/reservation-dialog";
import { ReviewDialog } from "@/components/review-dialog";
import { PageShell } from "@/components/site-shell";
import { StoryViewer } from "@/components/story-viewer";
import { PROVINCE_CENTERS } from "@/data/restaurant-coordinates";
import { useEffectiveStories } from "@/data/use-stories";
import { addressProvince, canDeliverToNeighborhood, getRestaurant } from "@/data/helpers";
import { useTranslation } from "@/i18n";
import { useCart } from "@/lib/cart";
import { estimateDeliveryMinutes } from "@/lib/delivery-history";
import { formatKz } from "@/lib/format";
import { formatKm, haversineKm } from "@/lib/geo";
import { useLocation } from "@/lib/location";
import { useRestaurantStatus } from "@/lib/restaurant-status";

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

function RestaurantDetail() {
  const restaurant = Route.useLoaderData();
  const { t } = useTranslation();
  const { selected: userLocation } = useLocation();
  const status = useRestaurantStatus(restaurant.id);
  const { orders } = useCart();
  const allStories = useEffectiveStories();
  const [reservingOpen, setReservingOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const [contentTab, setContentTab] = useState<"menu" | "media">("menu");

  const restaurantStories = allStories.filter((s) => s.restaurantId === restaurant.id);
  const hasStories = restaurantStories.length > 0;

  // Conteúdo multimédia: galeria de fotos do perfil + stories (imagem/vídeo)
  // ainda dentro das 24h. A aba só aparece se houver algo.
  const mediaItems = [
    ...restaurant.galleryImages
      .filter((src) => src.trim())
      .map((src) => ({ key: `g:${src}`, type: "image" as const, src })),
    ...restaurantStories.map((s) => ({
      key: `s:${s.id}`,
      type: (s.mediaType ?? "image") as "image" | "video",
      src: s.image,
    })),
  ];
  const hasMedia = mediaItems.length > 0;
  const activeTab = hasMedia ? contentTab : "menu";

  const paused = !status.available;
  const acceptsReservations = restaurant.acceptsReservations ?? true;
  const userProvince = userLocation ? addressProvince(userLocation.line2) : undefined;
  const outOfZone =
    restaurant.isDeliveryAvailable &&
    !!userProvince &&
    !canDeliverToNeighborhood(restaurant, userProvince);

  // Distância só quando dá para a calcular — a partir da província da morada
  // registada que o cliente tem selecionada (o valor seed não significa nada).
  const userCenter = userProvince ? PROVINCE_CENTERS[userProvince] : undefined;
  const distanceKm =
    userCenter && restaurant.lat != null && restaurant.lng != null
      ? haversineKm([userCenter.lat, userCenter.lng], [restaurant.lat, restaurant.lng])
      : null;

  // Tempo de entrega estimado a partir do histórico de entregas do
  // restaurante (faixa horária atual), com recuo para o valor do perfil.
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
            {hasStories && (
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
          <button
            type="button"
            onClick={() => setReviewOpen(true)}
            className="flex items-center gap-1.5 rounded-full border border-primary px-3.5 py-1 font-semibold text-primary transition-colors hover:bg-primary/5"
          >
            <PenLine className="h-3.5 w-3.5" />
            {t("restaurantDetail.review")}
          </button>
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
              {formatKz(restaurant.deliveryFee)}
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
          {hasMedia && (
            <div className="mb-5 inline-flex rounded-xl border border-border bg-card p-0.5 text-sm font-semibold">
              {(["menu", "media"] as const).map((tab) => (
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
                  {tab === "menu" ? <Soup className="h-4 w-4" /> : <Images className="h-4 w-4" />}
                  {t(tab === "menu" ? "restaurantDetail.tabMenu" : "restaurantDetail.tabMedia")}
                </button>
              ))}
            </div>
          )}

          {activeTab === "menu" ? (
            <MenuBrowser lockedRestaurantId={restaurant.id} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {mediaItems.map((m) =>
                m.type === "video" ? (
                  <video
                    key={m.key}
                    src={m.src}
                    controls
                    playsInline
                    className="aspect-video w-full rounded-xl border border-border bg-surface object-cover"
                  />
                ) : (
                  <img
                    key={m.key}
                    src={m.src}
                    alt={t("restaurantDetail.tabMedia")}
                    loading="lazy"
                    className="aspect-video w-full rounded-xl border border-border bg-surface object-cover"
                  />
                ),
              )}
            </div>
          )}
        </div>

        <section className="mt-10">
          <h2 className="font-display text-lg font-bold text-foreground">
            {t("restaurantDetail.aboutTitle")}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{restaurant.description}</p>
        </section>

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
      <ReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        restaurantId={restaurant.id}
        restaurantName={restaurant.name}
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
