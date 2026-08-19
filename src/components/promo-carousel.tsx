import { Link } from "@tanstack/react-router";
import { Bike, Percent, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { getRestaurant } from "@/data/helpers";
import { INITIAL_MENU_ITEMS, INITIAL_OFFERS } from "@/data/mockData";
import { formatKz } from "@/lib/format";

const offerIcon = { discount: Percent, delivery: Bike, "happy-hour": Sparkles } as const;

const promotedDishes = INITIAL_MENU_ITEMS.filter((item) => item.isPromoted);

/** Slides: ofertas gerais (→ /ofertas) + pratos em promoção de restaurantes (→ cardápio do restaurante). */
export function PromoCarousel() {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const slideCount = INITIAL_OFFERS.length + promotedDishes.length;

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => setCurrent(api.selectedScrollSnap()));
  }, [api]);

  useEffect(() => {
    if (!api) return;
    const id = setInterval(() => {
      api.scrollNext();
    }, 5000);
    return () => clearInterval(id);
  }, [api]);

  return (
    <div className="relative">
      <Carousel setApi={setApi} opts={{ loop: true }}>
        <CarouselContent className="-ml-0">
          {INITIAL_OFFERS.map((offer) => {
            const Icon = offerIcon[offer.type];
            return (
              <CarouselItem key={offer.id} className="pl-0">
                <Link
                  to="/ofertas"
                  className="flex min-h-40 flex-col justify-center gap-2 rounded-[2rem] bg-gradient-to-r from-primary to-primary/70 p-8 text-primary-foreground sm:min-h-48"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-background/15">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-1 text-xl font-extrabold sm:text-2xl">{offer.title}</h3>
                  <p className="max-w-md text-sm text-primary-foreground/90">{offer.description}</p>
                  {offer.code && (
                    <span className="mt-1 w-fit rounded-full bg-background/15 px-3 py-1 text-xs font-bold tracking-wide">
                      CÓDIGO {offer.code}
                    </span>
                  )}
                </Link>
              </CarouselItem>
            );
          })}
          {promotedDishes.map((item) => {
            const restaurant = getRestaurant(item.restaurantId);
            return (
              <CarouselItem key={item.id} className="pl-0">
                <Link
                  to="/cardapio"
                  search={{ restaurante: item.restaurantId }}
                  className="relative flex min-h-40 items-center gap-5 overflow-hidden rounded-[2rem] bg-gradient-to-r from-brand to-brand/70 p-8 text-brand-foreground sm:min-h-48"
                >
                  <div className="min-w-0">
                    {item.promotionLabel && (
                      <span className="w-fit rounded-full bg-background/15 px-3 py-1 text-xs font-bold tracking-wide">
                        {item.promotionLabel}
                      </span>
                    )}
                    <h3 className="mt-3 truncate text-xl font-extrabold sm:text-2xl">{item.name}</h3>
                    <p className="truncate text-sm text-brand-foreground/90">{restaurant?.name}</p>
                    <p className="mt-2 text-lg font-bold">{formatKz(item.price)}</p>
                  </div>
                  <img
                    src={item.image}
                    alt=""
                    aria-hidden
                    className="ml-auto hidden h-32 w-32 shrink-0 object-contain sm:block"
                  />
                </Link>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>

      <div className="mt-4 flex items-center justify-center gap-2">
        {Array.from({ length: slideCount }).map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Ir para slide ${i + 1}`}
            onClick={() => api?.scrollTo(i)}
            className={`h-2 rounded-full transition-all ${
              i === current ? "w-6 bg-primary" : "w-2 bg-border"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
