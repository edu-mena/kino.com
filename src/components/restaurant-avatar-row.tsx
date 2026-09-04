import { useNavigate } from "@tanstack/react-router";
import { Play, Store } from "lucide-react";
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { HorizontalCarousel } from "@/components/horizontal-carousel";
import { LazyImage } from "@/components/lazy-image";
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
  const navigate = useNavigate();
  // Restaurante com story já totalmente visto — pergunta ao usuário o que
  // quer fazer (ver o story de novo ou ir para a página do restaurante) em
  // vez de decidir por ele. Sem story: vai direto para o restaurante (não
  // há nada mais a mostrar aqui). Story não visto: abre o story direto,
  // como antes.
  const [choosing, setChoosing] = useState<Restaurant | null>(null);
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

  const openStory = (r: Restaurant) => {
    setChoosing(null);
    setStorySession({
      restaurants: orderedStoryRestaurants,
      startIndex: orderedStoryRestaurants.findIndex((sr) => sr.id === r.id),
    });
  };

  const goToRestaurant = (r: Restaurant) => {
    setChoosing(null);
    navigate({ to: "/restaurantes/$id", params: { id: r.id } });
  };

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
                if (!hasStory) goToRestaurant(r);
                else if (viewed) setChoosing(r);
                else openStory(r);
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
                <LazyImage
                  src={r.coverImage}
                  alt={r.name}
                  width={64}
                  height={64}
                  widths={[64, 128, 192]}
                  sizes="64px"
                  className="h-full w-full object-cover"
                />
              </span>
              <span className="w-full truncate text-center text-xs font-semibold text-foreground">
                {abbreviate(r.name)}
              </span>
            </button>
          );
        }}
      />

      <Dialog open={!!choosing} onOpenChange={(open) => !open && setChoosing(null)}>
        <DialogContent className="max-w-xs rounded-[1.5rem] border-none bg-card p-6 text-center">
          {choosing && (
            <>
              <DialogTitle className="font-display text-lg font-bold">{choosing.name}</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {t("restaurantAvatarRow.chooserDescription")}
              </DialogDescription>
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => openStory(choosing)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  <Play className="h-4 w-4" /> {t("restaurantAvatarRow.viewStoryAgain")}
                </button>
                <button
                  type="button"
                  onClick={() => goToRestaurant(choosing)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-primary px-5 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
                >
                  <Store className="h-4 w-4" /> {t("home.viewRestaurant")}
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

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
