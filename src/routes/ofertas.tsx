import { createFileRoute, Link } from "@tanstack/react-router";
import { Bike, Percent, Sparkles, Store } from "lucide-react";
import icon from "@/assets/icon.png";
import { PageHeading, PageShell } from "@/components/site-shell";
import { getRestaurant } from "@/data/helpers";
import { useOffers } from "@/data/use-offers";
import { translateOffer, useTranslation } from "@/i18n";

export const Route = createFileRoute("/ofertas")({
  head: () => ({
    meta: [
      { title: "Ofertas e promoções — Luku.com" },
      {
        name: "description",
        content:
          "Cupões, entrega grátis e happy hour: aproveite as promoções do Luku.com em pedidos de comida em Luanda.",
      },
      { property: "og:title", content: "Ofertas e promoções — Luku.com" },
      { property: "og:description", content: "Cupões, entrega grátis e happy hour todos os dias." },
      { property: "og:image", content: icon },
    ],
  }),
  component: Ofertas,
});

const iconByType = { discount: Percent, delivery: Bike, "happy-hour": Sparkles } as const;

function Ofertas() {
  const offers = useOffers();
  const { t } = useTranslation();
  return (
    <PageShell>
      <PageHeading
        eyebrow={t("ofertas.eyebrow")}
        title={t("ofertas.title")}
        description={t("ofertas.description")}
      />
      <div className="mx-auto mt-8 grid max-w-6xl gap-4 px-4 md:px-6">
        {offers.map((offer) => {
          const OfferIcon = iconByType[offer.type];
          const { title, description } = translateOffer(offer, t);
          const restaurant = offer.restaurantId ? getRestaurant(offer.restaurantId) : undefined;
          return (
            <div
              key={offer.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-[1.75rem] bg-primary p-6 text-primary-foreground sm:p-8"
            >
              <div className="min-w-0">
                {restaurant && (
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide opacity-90">
                    <Store className="h-3.5 w-3.5" />
                    {t("ofertas.atRestaurant", { name: restaurant.name })}
                  </p>
                )}
                <p className="mt-1 font-display text-2xl font-extrabold sm:text-3xl">{title}</p>
                <p className="mt-1 text-sm opacity-90">{description}</p>
                {offer.type !== "delivery" && offer.percentOff ? (
                  <p className="mt-2 text-sm font-bold">
                    {t("ofertas.percentOff", { pct: offer.percentOff })}
                  </p>
                ) : offer.type === "delivery" ? (
                  <p className="mt-2 text-sm font-bold">{t("ofertas.freeDelivery")}</p>
                ) : null}
                {offer.code && (
                  <p className="mt-3 inline-block rounded-full bg-brand px-3 py-1 text-xs font-bold">
                    {t("ofertas.code")}: {offer.code}
                  </p>
                )}
                <div className="mt-5">
                  <Link
                    to="/cardapio"
                    search={restaurant ? { restaurante: restaurant.id } : {}}
                    className="inline-block rounded-xl bg-card px-5 py-2.5 text-sm font-semibold text-primary"
                  >
                    {restaurant
                      ? t("ofertas.orderAt", { name: restaurant.name })
                      : t("ofertas.orderNow")}
                  </Link>
                </div>
              </div>
              {offer.mediaType === "video" && offer.image ? (
                <video
                  src={offer.image}
                  poster={offer.thumbnail}
                  muted
                  loop
                  playsInline
                  autoPlay
                  className="h-20 w-20 shrink-0 rounded-2xl bg-black object-cover sm:h-28 sm:w-28"
                />
              ) : offer.image ? (
                <img
                  src={offer.image}
                  alt=""
                  className="h-20 w-20 shrink-0 rounded-2xl object-cover sm:h-28 sm:w-28"
                />
              ) : (
                <span className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-white/15 sm:h-28 sm:w-28">
                  <OfferIcon className="h-9 w-9 sm:h-12 sm:w-12" />
                </span>
              )}
            </div>
          );
        })}
      </div>
    </PageShell>
  );
}
