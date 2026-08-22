import { createFileRoute, notFound } from "@tanstack/react-router";
import { Bike, CalendarCheck, MapPin, Phone, Star } from "lucide-react";
import { useState } from "react";
import icon from "@/assets/icon.png";
import { MenuBrowser } from "@/components/menu-browser";
import { ReservationDialog } from "@/components/reservation-dialog";
import { PageShell } from "@/components/site-shell";
import { getRestaurant } from "@/data/helpers";
import { formatKz } from "@/lib/format";

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
  const [reservingOpen, setReservingOpen] = useState(false);

  return (
    <PageShell>
      <div className="relative h-56 overflow-hidden sm:h-72">
        <img src={restaurant.coverImage} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-4 pb-5 md:px-6">
          <h1 className="font-display text-3xl font-extrabold text-white sm:text-4xl">
            {restaurant.name}
          </h1>
          <p className="mt-1 text-sm text-white/90">
            {restaurant.cuisine} · {restaurant.priceLevel}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-6 md:px-6">
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1 font-semibold text-foreground">
            <Star className="h-4 w-4 fill-star text-star" />
            {restaurant.rating} ({restaurant.reviewCount})
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {restaurant.neighborhood} · {restaurant.distanceKm} km
          </span>
          {restaurant.isDeliveryAvailable && (
            <span className="flex items-center gap-1">
              <Bike className="h-4 w-4" />
              {restaurant.estimatedDeliveryMinutes} min · {formatKz(restaurant.deliveryFee)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Phone className="h-4 w-4" />
            {restaurant.phone}
          </span>
        </div>

        <p className="mt-4 max-w-2xl text-sm text-muted-foreground">{restaurant.description}</p>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setReservingOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-primary px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
          >
            <CalendarCheck className="h-4 w-4" />
            Reservar mesa
          </button>
        </div>

        <div className="mt-8">
          <MenuBrowser lockedRestaurantId={restaurant.id} />
        </div>
      </div>

      <ReservationDialog restaurant={restaurant} open={reservingOpen} onOpenChange={setReservingOpen} />
    </PageShell>
  );
}
