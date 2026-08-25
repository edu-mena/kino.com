import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dishDrink from "@/assets/dish-drink.png";
import heroFood from "@/assets/hero-food.jpg";
import kinoVideo from "@/assets/kino/video.mp4";
import restaurantAngolana from "@/assets/restaurant-angolana.jpg";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { getRestaurant } from "@/data/helpers";
import type { MenuItem, Offer } from "@/data/types";
import { useMenuItems } from "@/data/use-menu-items";
import { useOffers } from "@/data/use-offers";
import { formatKz } from "@/lib/format";
import { translateOffer, useTranslation } from "@/i18n";

const MAX_SLIDES = 8;

type LinkTarget =
  { to: "/ofertas" } | { to: "/cardapio"; search: { restaurante: string } } | { to: "/kino" };

type Slide =
  | {
      id: string;
      kind: "split";
      title: string;
      description: string;
      cta: string;
      image: string;
      target: LinkTarget;
    }
  | {
      id: string;
      kind: "cover";
      title: string;
      description: string;
      cta: string;
      image: string;
      target: LinkTarget;
    }
  | {
      id: string;
      kind: "video";
      title: string;
      description: string;
      cta: string;
      video: string;
      orientation: "horizontal" | "vertical";
      target: LinkTarget;
    };

// Ofertas não têm imagem própria (nem as da Kino nem as criadas por
// restaurantes) — este pool decorativo é reciclado por índice, o que
// generaliza sem problema para qualquer número de ofertas (não só as 3
// originais da Kino).
const offerSlideImages = [restaurantAngolana, heroFood, dishDrink];

function buildSlides(
  t: ReturnType<typeof useTranslation>["t"],
  offers: Offer[],
  promotedDishes: MenuItem[],
): Slide[] {
  const slides: Slide[] = [];

  offers.forEach((offer, i) => {
    if (slides.length >= MAX_SLIDES) return;
    const { title, description } = translateOffer(offer, t);
    slides.push({
      id: offer.id,
      kind: i % 2 === 0 ? "split" : "cover",
      title,
      description,
      cta: offer.code ? t("home.promoUseCode", { code: offer.code }) : t("home.promoSeeOffer"),
      image: offerSlideImages[i % offerSlideImages.length]!,
      target: { to: "/ofertas" },
    });
  });

  slides.push({
    id: "video-kino",
    kind: "video",
    title: t("home.promoVideoTitle"),
    description: t("home.promoVideoDescription"),
    cta: t("home.promoVideoCta"),
    video: kinoVideo,
    orientation: "vertical",
    target: { to: "/kino" },
  });

  promotedDishes.forEach((item, i) => {
    if (slides.length >= MAX_SLIDES) return;
    const restaurant = getRestaurant(item.restaurantId);
    slides.push({
      id: item.id,
      kind: i % 2 === 0 ? "cover" : "split",
      title: item.name,
      description: restaurant
        ? `${restaurant.name} — ${item.promotionLabel ?? formatKz(item.price)}`
        : (item.promotionLabel ?? formatKz(item.price)),
      cta: t("home.promoSeeInMenu"),
      image: item.image,
      target: { to: "/cardapio", search: { restaurante: item.restaurantId } },
    });
  });

  return slides.slice(0, MAX_SLIDES);
}

function SlideCta({ target, children }: { target: LinkTarget; children: React.ReactNode }) {
  return (
    <Link
      {...target}
      className="inline-flex w-fit items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
    >
      {children}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

/** Botão invisível que cobre a mídia (imagem/vídeo) e abre o lightbox — sempre um irmão do CTA, nunca aninhado nele. */
function MediaTrigger({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="absolute inset-0 z-0 cursor-zoom-in"
    />
  );
}

/** Ao clicar na imagem/vídeo, ele abre por completo (sem cortes) sobre um fundo cinza claro, com o resto da página em segundo plano. */
function MediaLightbox({
  open,
  onOpenChange,
  media,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  media: { type: "image"; src: string } | { type: "video"; src: string };
}) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl overflow-hidden rounded-[2rem] border-none bg-neutral-100 p-2">
        <DialogTitle className="sr-only">{t("home.previewTitle")}</DialogTitle>
        {media.type === "image" ? (
          <img
            src={media.src}
            alt=""
            className="max-h-[75vh] w-full rounded-[1.5rem] object-contain"
          />
        ) : (
          <video
            src={media.src}
            controls
            autoPlay
            playsInline
            className="max-h-[75vh] w-full rounded-[1.5rem] object-contain"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SlideCard({ slide }: { slide: Slide }) {
  const { t } = useTranslation();
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (slide.kind === "split") {
    return (
      <div className="flex h-96 flex-col overflow-hidden rounded-[2rem] border border-border bg-card sm:h-72 sm:flex-row">
        {/* Mobile: imagem em cima do texto. Desktop: texto encolhe pro conteúdo,
            imagem absorve o resto (com teto, senão ela estoura em telas grandes). */}
        <div className="relative order-1 h-44 w-full p-3 sm:order-none sm:h-auto sm:min-w-0 sm:max-w-[45%] sm:flex-1 sm:p-3 sm:pl-0">
          <img
            src={slide.image}
            alt=""
            aria-hidden
            className="h-full w-full rounded-[1.5rem] object-cover"
          />
          <MediaTrigger
            onClick={() => setLightboxOpen(true)}
            label={t("home.promoImageAria", { title: slide.title })}
          />
        </div>
        <div className="order-2 flex w-full flex-col justify-center gap-[10px] p-5 sm:order-none sm:w-fit sm:shrink-0 sm:max-w-xs sm:p-8">
          <h3 className="truncate text-xl font-extrabold text-primary sm:overflow-visible sm:whitespace-normal sm:text-clip sm:text-2xl">
            {slide.title}
          </h3>
          <p className="line-clamp-2 text-sm text-muted-foreground sm:line-clamp-none">
            {slide.description}
          </p>
          <SlideCta target={slide.target}>{slide.cta}</SlideCta>
        </div>
        <MediaLightbox
          open={lightboxOpen}
          onOpenChange={setLightboxOpen}
          media={{ type: "image", src: slide.image }}
        />
      </div>
    );
  }

  if (slide.kind === "cover") {
    return (
      <div className="relative h-96 overflow-hidden rounded-[2rem] sm:h-72">
        <img
          src={slide.image}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full rounded-[2rem] object-cover"
        />
        <MediaTrigger
          onClick={() => setLightboxOpen(true)}
          label={t("home.promoImageAria", { title: slide.title })}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
        <div className="relative z-10 flex h-full flex-col items-center justify-center gap-[10px] p-8 text-center">
          <h3 className="w-full max-w-md truncate text-xl font-extrabold text-white sm:overflow-visible sm:whitespace-normal sm:text-clip sm:text-2xl">
            {slide.title}
          </h3>
          <p className="line-clamp-2 max-w-sm text-sm text-white/90 sm:line-clamp-none">
            {slide.description}
          </p>
          <SlideCta target={slide.target}>{slide.cta}</SlideCta>
        </div>
        <MediaLightbox
          open={lightboxOpen}
          onOpenChange={setLightboxOpen}
          media={{ type: "image", src: slide.image }}
        />
      </div>
    );
  }

  // video — mesmo princípio do "split": texto encolhe pro conteúdo, vídeo
  // ocupa o resto (com teto, senão ele estoura em telas grandes — mais
  // apertado ainda se for vertical). Mobile: vídeo em cima do texto.
  const vertical = slide.orientation === "vertical";
  return (
    <div className="flex h-96 flex-col overflow-hidden rounded-[2rem] border border-border bg-card sm:h-72 sm:flex-row">
      <div
        className={`relative order-1 h-44 w-full p-3 sm:order-none sm:h-auto sm:min-w-0 sm:flex-1 sm:p-3 sm:pl-0 ${
          vertical ? "sm:max-w-[40%]" : "sm:max-w-[45%]"
        }`}
      >
        <video
          src={slide.video}
          autoPlay
          loop
          muted
          playsInline
          className="h-full w-full rounded-[1.5rem] object-cover"
        />
        <MediaTrigger
          onClick={() => setLightboxOpen(true)}
          label={t("home.promoVideoAria", { title: slide.title })}
        />
      </div>
      <div className="order-2 flex w-full flex-col justify-center gap-[10px] p-5 sm:order-none sm:w-fit sm:shrink-0 sm:max-w-xs sm:p-8">
        <h3 className="truncate text-xl font-extrabold text-primary sm:overflow-visible sm:whitespace-normal sm:text-clip sm:text-2xl">
          {slide.title}
        </h3>
        <p className="line-clamp-2 text-sm text-muted-foreground sm:line-clamp-none">
          {slide.description}
        </p>
        <SlideCta target={slide.target}>{slide.cta}</SlideCta>
      </div>
      <MediaLightbox
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        media={{ type: "video", src: slide.video }}
      />
    </div>
  );
}

const AUTOPLAY_INTERVAL = 5000;
/** Ao interagir (arrastar ou clicar num ponto), o autoplay só volta 8s
 * depois — e cada nova interação empurra essa pausa mais 8s pra frente. */
const INTERACTION_PAUSE = 8000;

/** Slides: ofertas gerais + pratos em promoção — 3 layouts diferentes (split, cover, vídeo) pra não repetir sempre a mesma aparência. Máx. 8 slides. */
export function PromoCarousel() {
  // `t` muda de identidade sempre que o idioma muda (ver useTranslation),
  // então basta como dependência pra recalcular título/descrição/cta dos
  // slides fixos — os dados variáveis (ofertas, pratos) não mudam com o
  // idioma, só o texto da "casca".
  const { t } = useTranslation();
  const offers = useOffers();
  const menuItems = useMenuItems();
  const promotedDishes = useMemo(() => menuItems.filter((item) => item.isPromoted), [menuItems]);
  const slides = useMemo(() => buildSlides(t, offers, promotedDishes), [t, offers, promotedDishes]);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleAutoplay = useCallback(
    (delay: number) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (!api) return;
      timerRef.current = setTimeout(() => {
        api.scrollNext();
        scheduleAutoplay(AUTOPLAY_INTERVAL);
      }, delay);
    },
    [api],
  );

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => setCurrent(api.selectedScrollSnap()));
  }, [api]);

  useEffect(() => {
    if (!api) return;
    scheduleAutoplay(AUTOPLAY_INTERVAL);
    const onInteraction = () => scheduleAutoplay(INTERACTION_PAUSE);
    api.on("pointerDown", onInteraction);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      api.off("pointerDown", onInteraction);
    };
  }, [api, scheduleAutoplay]);

  return (
    <div className="relative">
      <Carousel setApi={setApi} opts={{ loop: true }}>
        <CarouselContent className="-ml-0">
          {slides.map((slide) => (
            <CarouselItem key={slide.id} className="pl-0">
              <SlideCard slide={slide} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      <div className="mt-4 flex items-center justify-center gap-2">
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            type="button"
            aria-label={t("home.promoSlideAria", { n: i + 1 })}
            onClick={() => {
              api?.scrollTo(i);
              scheduleAutoplay(INTERACTION_PAUSE);
            }}
            className={`h-2 rounded-full transition-all ${
              i === current ? "w-6 bg-primary" : "w-2 bg-border"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
