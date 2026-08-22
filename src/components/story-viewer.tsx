import { X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { getStoriesForRestaurant } from "@/data/helpers";
import type { Restaurant } from "@/data/types";
import { useStories } from "@/lib/stories";

const STORY_DURATION = 5000;

/**
 * Visualizador de stories — mistura o comportamento do Instagram/Facebook
 * (barrinhas de progresso, avança sozinho, tap nas laterais navega, segurar
 * pausa) com o visual de anel do WhatsApp (feito no avatar, não aqui).
 * Sem likes/comentários — só visualização.
 *
 * Mobile: fullscreen, uma coluna. Desktop (`lg:`): split — lista de
 * restaurantes à esquerda, story em exibição à direita.
 */
export function StoryViewer({
  restaurants,
  startIndex,
  onClose,
}: {
  restaurants: Restaurant[];
  startIndex: number;
  onClose: () => void;
}) {
  const { markStoryViewed, isRestaurantFullyViewed } = useStories();
  const [restaurantIdx, setRestaurantIdx] = useState(startIndex);
  const [storyIdx, setStoryIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const pointerDownAt = useRef(0);

  const restaurant = restaurants[restaurantIdx];
  const stories = useMemo(
    () => (restaurant ? getStoriesForRestaurant(restaurant.id) : []),
    [restaurant],
  );
  const story = stories[storyIdx];

  useEffect(() => {
    if (story) markStoryViewed(story.id);
  }, [story, markStoryViewed]);

  const goNext = () => {
    if (storyIdx < stories.length - 1) {
      setStoryIdx((i) => i + 1);
      return;
    }
    if (restaurantIdx < restaurants.length - 1) {
      setRestaurantIdx((i) => i + 1);
      setStoryIdx(0);
      return;
    }
    onClose();
  };

  const goPrev = () => {
    if (storyIdx > 0) {
      setStoryIdx((i) => i - 1);
      return;
    }
    if (restaurantIdx > 0) {
      const prevRestaurant = restaurants[restaurantIdx - 1];
      const prevStories = prevRestaurant ? getStoriesForRestaurant(prevRestaurant.id) : [];
      setRestaurantIdx((i) => i - 1);
      setStoryIdx(Math.max(0, prevStories.length - 1));
    }
  };

  const jumpTo = (index: number) => {
    setRestaurantIdx(index);
    setStoryIdx(0);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantIdx, storyIdx]);

  if (!restaurant || !story) return null;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        hideCloseButton
        className="left-0 top-0 h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 gap-0 overflow-hidden border-none bg-black p-0 sm:rounded-none lg:left-1/2 lg:top-1/2 lg:h-[85vh] lg:w-[960px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-[1.5rem]"
      >
        <DialogTitle className="sr-only">Stories de {restaurant.name}</DialogTitle>
        <div className="flex h-full w-full">
          {/* Desktop: lista de restaurantes com stories */}
          <div className="hidden w-72 shrink-0 flex-col overflow-y-auto border-r border-white/10 bg-neutral-900 p-3 lg:flex">
            <p className="px-2 pb-3 pt-1 text-xs font-bold uppercase tracking-wide text-white/50">
              Stories
            </p>
            {restaurants.map((r, i) => {
              const viewed = isRestaurantFullyViewed(r.id);
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => jumpTo(i)}
                  className={`flex items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors ${
                    i === restaurantIdx ? "bg-white/10" : "hover:bg-white/5"
                  }`}
                >
                  <span
                    className={`h-11 w-11 shrink-0 overflow-hidden rounded-full ${
                      viewed ? "ring-2 ring-white/30" : "ring-2 ring-primary"
                    } ring-offset-2 ring-offset-neutral-900`}
                  >
                    <img src={r.coverImage} alt="" className="h-full w-full object-cover" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">
                    {r.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Story em exibição */}
          <div
            className="relative flex-1 select-none bg-black"
            onPointerDown={() => {
              pointerDownAt.current = Date.now();
              setPaused(true);
            }}
            onPointerUp={(e) => {
              setPaused(false);
              const held = Date.now() - pointerDownAt.current;
              if (held > 300) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              if (x < rect.width / 3) goPrev();
              else goNext();
            }}
          >
            <div className="absolute inset-x-0 top-0 z-20 flex gap-1 p-2 pt-3">
              {stories.map((s, i) => (
                <div key={s.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
                  {i < storyIdx ? (
                    <div className="h-full w-full bg-white" />
                  ) : i === storyIdx ? (
                    <div
                      key={`${restaurant.id}-${s.id}`}
                      className="h-full origin-left bg-white [animation-fill-mode:forwards] [animation-name:story-progress] [animation-timing-function:linear]"
                      style={{
                        animationDuration: `${STORY_DURATION}ms`,
                        animationPlayState: paused ? "paused" : "running",
                      }}
                      onAnimationEnd={goNext}
                    />
                  ) : null}
                </div>
              ))}
            </div>

            <div className="absolute inset-x-0 top-6 z-20 flex items-center justify-between px-3">
              <div className="flex items-center gap-2">
                <img
                  src={restaurant.coverImage}
                  alt=""
                  className="h-8 w-8 rounded-full object-cover"
                />
                <span className="text-sm font-semibold text-white drop-shadow">
                  {restaurant.name}
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar stories"
                className="grid h-8 w-8 place-items-center rounded-full text-white/90 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid h-full place-items-center">
              <img
                src={story.image}
                alt=""
                className="max-h-full w-full object-contain lg:h-full"
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
