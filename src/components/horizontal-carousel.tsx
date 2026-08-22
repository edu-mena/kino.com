import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";

const AUTOPLAY_INTERVAL = 5000;

/**
 * Substitui o scroll horizontal nativo (que não funciona bem sem touch —
 * mouse/trackpad não geram scroll lateral sozinhos) nas linhas da home
 * (restaurantes, recomendações, grelhados, etc.): arraste com o mouse
 * (embla), setas de navegação, e avanço automático a cada 5s que para
 * assim que detecta qualquer interação do usuário (arrastar ou clicar
 * numa seta) — não retoma sozinho depois.
 */
export function HorizontalCarousel<T>({
  items,
  itemKey,
  renderItem,
}: {
  items: T[];
  itemKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
}) {
  const [api, setApi] = useState<CarouselApi>();
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const stoppedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!api) return;
    const update = () => {
      setCanPrev(api.canScrollPrev());
      setCanNext(api.canScrollNext());
    };
    update();
    api.on("select", update);
    api.on("reInit", update);
  }, [api]);

  useEffect(() => {
    if (!api) return;
    const tick = () => {
      if (stoppedRef.current || !api.canScrollNext()) return;
      api.scrollNext();
      timerRef.current = setTimeout(tick, AUTOPLAY_INTERVAL);
    };
    const stopAutoplay = () => {
      stoppedRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    timerRef.current = setTimeout(tick, AUTOPLAY_INTERVAL);
    api.on("pointerDown", stopAutoplay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      api.off("pointerDown", stopAutoplay);
    };
  }, [api]);

  const navigate = (dir: "prev" | "next") => {
    stoppedRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (dir === "prev") api?.scrollPrev();
    else api?.scrollNext();
  };

  return (
    <div className="relative">
      <Carousel setApi={setApi} opts={{ align: "start", dragFree: true, containScroll: "trimSnaps" }}>
        <CarouselContent>
          {items.map((item) => (
            <CarouselItem key={itemKey(item)} className="basis-auto">
              {renderItem(item)}
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {canPrev && (
        <button
          type="button"
          aria-label="Anterior"
          onClick={() => navigate("prev")}
          className="absolute -left-3 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-brand text-white shadow-md transition-opacity hover:opacity-90"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      {canNext && (
        <button
          type="button"
          aria-label="Próximo"
          onClick={() => navigate("next")}
          className="absolute -right-3 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-brand text-white shadow-md transition-opacity hover:opacity-90"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
