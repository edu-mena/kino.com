import { Link } from "@tanstack/react-router";
import { Bike, Star } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import type { Restaurant } from "@/data/types";
import { INITIAL_RESTAURANTS } from "@/data/mockData";

const sorted = [...INITIAL_RESTAURANTS].sort((a, b) => a.distanceKm - b.distanceKm);

function abbreviate(name: string) {
  return name.length > 14 ? `${name.slice(0, 13)}…` : name;
}

export function RestaurantAvatarRow() {
  const [active, setActive] = useState<Restaurant | null>(null);

  return (
    <>
      <div className="no-scrollbar flex gap-5 overflow-x-auto pb-1">
        {sorted.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setActive(r)}
            className="flex w-20 shrink-0 flex-col items-center gap-2"
          >
            <span className="h-16 w-16 overflow-hidden rounded-full border border-border bg-surface">
              <img src={r.coverImage} alt={r.name} className="h-full w-full object-cover" />
            </span>
            <span className="w-full truncate text-center text-xs font-semibold text-foreground">
              {abbreviate(r.name)}
            </span>
          </button>
        ))}
      </div>

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
                    {active.rating} <span className="text-muted-foreground">({active.reviewCount})</span>
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
                <Link
                  to="/cardapio"
                  search={{ restaurante: active.id }}
                  onClick={() => setActive(null)}
                  className="mt-5 block w-full rounded-xl bg-primary px-5 py-3 text-center text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Ver cardápio
                </Link>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
