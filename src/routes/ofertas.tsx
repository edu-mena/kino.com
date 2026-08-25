import { createFileRoute, Link } from "@tanstack/react-router";
import { Bike, Percent, Sparkles } from "lucide-react";
import icon from "@/assets/icon.png";
import { PageHeading, PageShell } from "@/components/site-shell";
import { useOffers } from "@/data/use-offers";
import { translateOffer, useTranslation } from "@/i18n";

export const Route = createFileRoute("/ofertas")({
  head: () => ({
    meta: [
      { title: "Ofertas e promoções — Kino.com" },
      {
        name: "description",
        content:
          "Cupões, entrega grátis e happy hour: aproveite as promoções do Kino.com em pedidos de comida em Luanda.",
      },
      { property: "og:title", content: "Ofertas e promoções — Kino.com" },
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
          return (
            <div
              key={offer.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-[1.75rem] bg-primary p-6 text-primary-foreground sm:p-8"
            >
              <div className="min-w-0">
                <p className="font-display text-2xl font-extrabold sm:text-3xl">{title}</p>
                <p className="mt-1 text-sm opacity-90">{description}</p>
                {offer.code && (
                  <p className="mt-3 inline-block rounded-full bg-brand px-3 py-1 text-xs font-bold">
                    {t("ofertas.code")}: {offer.code}
                  </p>
                )}
                <div className="mt-5">
                  <Link
                    to="/cardapio"
                    className="inline-block rounded-xl bg-card px-5 py-2.5 text-sm font-semibold text-primary"
                  >
                    {t("ofertas.orderNow")}
                  </Link>
                </div>
              </div>
              <span className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-white/15 sm:h-28 sm:w-28">
                <OfferIcon className="h-9 w-9 sm:h-12 sm:w-12" />
              </span>
            </div>
          );
        })}
      </div>
    </PageShell>
  );
}
