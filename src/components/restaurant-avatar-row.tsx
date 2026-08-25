import { Link } from "@tanstack/react-router";
import { Bike, CalendarCheck, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { HorizontalCarousel } from "@/components/horizontal-carousel";
import { ReservationDialog } from "@/components/reservation-dialog";
import { StoryViewer } from "@/components/story-viewer";
import { getRestaurantsWithStories } from "@/data/helpers";
import type { Restaurant } from "@/data/types";
import { INITIAL_RESTAURANTS } from "@/data/mockData";
import { useEffectiveStories } from "@/data/use-stories";
import { useStories } from "@/lib/stories";
import { useTranslation } from "@/i18n";

const sorted = [...INITIAL_RESTAURANTS].sort((a, b) => a.distanceKm - b.distanceKm);

function abbreviate(name: string) {
  return name.length > 14 ? `${name.slice(0, 13)}…` : name;
}

export function RestaurantAvatarRow() {
  const { t } = useTranslation();
  const [active, setActive] = useState<Restaurant | null>(null);
  // Reage a stories criados/apagados no painel do restaurante — não os
  // usa diretamente (a lista já vem por restaurante via
  // `getRestaurantsWithStories()`), só para saber quando recalcular.
  const stories = useEffectiveStories();
  const restaurantsWithStories = useMemo(
    () => getRestaurantsWithStories(),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `stories` not read directly, only used to know when to recompute (getRestaurantsWithStories() reads the same live store itself).
    [stories],
  );
  const storyRestaurantIds = useMemo(
    () => new Set(restaurantsWithStories.map((r) => r.id)),
    [restaurantsWithStories],
  );
  const [reservingRestaurant, setReservingRestaurant] = useState<Restaurant | null>(null);
  // Congela a lista + índice no momento do clique — abrir um story marca-o
  // como visto na hora, o que reordena `orderedStoryRestaurants` (não-vistos
  // primeiro); sem essa foto congelada, o StoryViewer indexaria numa lista
  // que muda debaixo dele e "pularia" pro restaurante errado a meio da
  // visualização.
  const [storySession, setStorySession] = useState<{
    restaurants: Restaurant[];
    startIndex: number;
  } | null>(null);
  const { isRestaurantFullyViewed } = useStories();

  // Restaurantes com story: não vistos primeiro, vistos depois (igual WhatsApp).
  // Sem story: mantém a ordem por distância, sempre no final da linha.
  const orderedStoryRestaurants = useMemo(
    () =>
      [...restaurantsWithStories].sort((a, b) => {
        const aViewed = isRestaurantFullyViewed(a.id) ? 1 : 0;
        const bViewed = isRestaurantFullyViewed(b.id) ? 1 : 0;
        return aViewed - bViewed;
      }),
    [restaurantsWithStories, isRestaurantFullyViewed],
  );

  const avatarList = [
    ...orderedStoryRestaurants,
    ...sorted.filter((r) => !storyRestaurantIds.has(r.id)),
  ];

  return (
    <>
      <HorizontalCarousel
        items={avatarList}
        itemKey={(r) => r.id}
        renderItem={(r) => {
          const hasStory = storyRestaurantIds.has(r.id);
          const viewed = hasStory && isRestaurantFullyViewed(r.id);

          return (
            <button
              type="button"
              onClick={() => {
                if (hasStory) {
                  setStorySession({
                    restaurants: orderedStoryRestaurants,
                    startIndex: orderedStoryRestaurants.findIndex((sr) => sr.id === r.id),
                  });
                } else {
                  setActive(r);
                }
              }}
              className="flex w-20 shrink-0 flex-col items-center gap-2"
            >
              <span
                className={`h-16 w-16 shrink-0 overflow-hidden rounded-full bg-surface ${
                  hasStory
                    ? `ring-2 ring-offset-2 ring-offset-background ${viewed ? "ring-border" : "ring-primary"}`
                    : "border border-border"
                }`}
              >
                <img src={r.coverImage} alt={r.name} className="h-full w-full object-cover" />
              </span>
              <span className="w-full truncate text-center text-xs font-semibold text-foreground">
                {abbreviate(r.name)}
              </span>
            </button>
          );
        }}
      />

      <Dialog open={!!active} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent className="max-w-md rounded-[2rem] border-none bg-card p-0">
          {active && (
            <>
              <Carousel opts={{ loop: true }}>
                <CarouselContent className="-ml-0">
                  {active.galleryImages.map((src, i) => (
                    <CarouselItem key={i} className="pl-0">
                      <img
                        src={src}
                        alt={`${active.name} ${i + 1}`}
                        className="h-56 w-full rounded-t-[2rem] object-cover"
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>

              <div className="p-6 pt-4">
                <DialogTitle className="font-display text-xl font-bold">{active.name}</DialogTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {active.cuisine} · {active.priceLevel}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                  <span className="flex items-center gap-1 font-semibold text-foreground">
                    <Star className="h-4 w-4 fill-star text-star" />
                    {active.rating}{" "}
                    <span className="text-muted-foreground">({active.reviewCount})</span>
                  </span>
                  {active.isDeliveryAvailable && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Bike className="h-4 w-4" />
                      {active.estimatedDeliveryMinutes} min
                    </span>
                  )}
                  <span className="text-muted-foreground">{active.distanceKm} km</span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{active.description}</p>
                <div className="mt-5 flex gap-3">
                  <Link
                    to="/restaurantes/$id"
                    params={{ id: active.id }}
                    onClick={() => setActive(null)}
                    className="flex-1 rounded-xl bg-primary px-5 py-3 text-center text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    {t("home.viewRestaurant")}
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setReservingRestaurant(active);
                      setActive(null);
                    }}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-primary px-5 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
                  >
                    <CalendarCheck className="h-4 w-4" />
                    {t("reservas.reserveTable")}
                  </button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {reservingRestaurant && (
        <ReservationDialog
          restaurant={reservingRestaurant}
          open={!!reservingRestaurant}
          onOpenChange={(open) => !open && setReservingRestaurant(null)}
        />
      )}

      {storySession && (
        <StoryViewer
          restaurants={storySession.restaurants}
          startIndex={storySession.startIndex}
          onClose={() => setStorySession(null)}
        />
      )}
    </>
  );
}
