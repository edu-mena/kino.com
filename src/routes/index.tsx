import { createFileRoute, Link } from "@tanstack/react-router";
import { Armchair, ArrowRight, Tag } from "lucide-react";
import { useMemo } from "react";
import heroBg from "@/assets/hero.png";
import icon from "@/assets/icon.png";
import { DietaryPreferencesCard } from "@/components/dietary-preferences-card";
import { DishRecommendationRow } from "@/components/dish-recommendation-row";
import { HeaderSearch } from "@/components/header-search";
import { HomeSkeleton } from "@/components/home-skeleton";
import { OnboardingTour, TutorialHint } from "@/components/onboarding-tour";
import { PromoCarousel } from "@/components/promo-carousel";
import { RestaurantAvatarRow } from "@/components/restaurant-avatar-row";
import { PageShell, SiteHeader } from "@/components/site-shell";
import { useMenuItems } from "@/data/use-menu-items";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kino.com — Comida de Luanda entregue em minutos" },
      {
        name: "description",
        content:
          "Burgers, pizza, pratos angolanos e bebidas dos melhores restaurantes de Luanda, entregues quentes em minutos.",
      },
      { property: "og:title", content: "Kino.com — Comida de Luanda entregue em minutos" },
      {
        property: "og:description",
        content: "Peça em minutos dos melhores restaurantes de Luanda.",
      },
      { property: "og:image", content: icon },
    ],
  }),
  component: Home,
});

function Home() {
  const { isLoggedIn, user, isLoading } = useAuth();

  // Evita mostrar a home errada (convidado ↔ logado) por um instante
  // antes do AuthProvider terminar de ler o localStorage.
  if (isLoading) {
    return <HomeSkeleton />;
  }

  if (isLoggedIn && user) {
    return <HomeLoggedIn />;
  }

  return <HomeNotLoggedIn />;
}

function HomeNotLoggedIn() {
  const { t } = useTranslation();
  return (
    <PageShell header={<SiteHeader variant="guestHome" />} footer={null} showMobileTabBar={false}>
      <img
        src={heroBg}
        alt=""
        aria-hidden
        className="pointer-events-none fixed right-0 top-0 -z-10 w-screen select-none md:h-screen md:object-cover"
      />

      <section className="mx-auto max-w-6xl px-4 pt-4 md:px-6 md:pt-4">
        <div className="max-w-xl mt-30 md:mt-0">
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] text-primary sm:text-5xl lg:text-6xl">
            {t("homeGuest.heroLine1")}
            <br />
            <span className="text-brand">{t("homeGuest.heroLine2")}</span>?
          </h1>
          <p className="mt-4 text-[1.1rem] max-w-md text-muted-foreground">
            {t("homeGuest.subtitle")}
            <br />
            {t("homeGuest.subtitleBrandPrefix")}{" "}
            <Link to="/kino" viewTransition className="font-semibold text-brand hover:underline">
              Kino.com
            </Link>
            .
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              to="/cadastro"
              className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              {t("homeGuest.login")}
            </Link>
            <Link
              to="/kino"
              viewTransition
              className="rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary"
            >
              {t("homeGuest.whatIsKino")}
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-5 max-w-6xl px-4 md:px-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            {
              icon: Armchair,
              title: t("homeGuest.reserveTitle"),
              text: t("homeGuest.reserveText"),
            },
            { icon: Tag, title: t("homeGuest.offersTitle"), text: t("homeGuest.offersText") },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-border bg-card p-5 text-left"
            >
              <span className="grid h-11 w-11 place-items-center rounded-full border border-border bg-background text-brand">
                <item.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-display text-base font-bold text-primary">{item.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}

function SectionHeading({
  title,
  to,
  search,
}: {
  title: string;
  to?: "/cardapio" | "/restaurantes";
  search?: { categoria?: string | undefined };
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-end justify-between gap-4">
      <h2 className="text-2xl font-extrabold text-primary">{title}</h2>
      {to && (
        <Link
          to={to}
          {...(search ? { search } : {})}
          className="inline-flex items-center gap-1 text-sm font-semibold text-brand"
        >
          {t("home.seeMore")} <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

function HomeLoggedIn() {
  const { t } = useTranslation();
  const items = useMenuItems();

  // Derivados da lista efetiva de pratos (reativa a criações/edições no
  // painel do restaurante) — não do seed estático diretamente.
  const fastFoodItems = useMemo(() => items.filter((m) => m.category === "Fast-food"), [items]);
  const grelhadosItems = useMemo(() => items.filter((m) => m.category === "Grelhados"), [items]);
  const trendingItems = useMemo(
    () =>
      [...items]
        .filter((m) => m.isTrending || (m.orderCount ?? 0) > 0)
        .sort((a, b) => (b.orderCount ?? 0) - (a.orderCount ?? 0)),
    [items],
  );
  const recommendedItems = useMemo(() => items.slice(0, 10), [items]);

  return (
    <PageShell>
      <OnboardingTour />
      <TutorialHint />

      {/* Busca (mensagem de boas-vindas mudou pro header — ver SiteHeader) */}
      <section className="mx-auto max-w-6xl px-4 pt-3 md:px-6">
        <HeaderSearch />
      </section>

      {/* Promoções */}
      <section className="mx-auto mt-8 max-w-6xl px-4 md:px-6">
        <PromoCarousel />
      </section>

      {/* Restaurantes próximos */}
      <section className="mx-auto mt-12 max-w-6xl px-4 md:px-6">
        <SectionHeading title={t("home.restaurantsNearYou")} to="/restaurantes" />
        <div className="mt-5">
          <RestaurantAvatarRow />
        </div>
      </section>

      {/* Recomendações */}
      <section className="mx-auto mt-12 max-w-6xl px-4 md:px-6">
        <SectionHeading title={t("home.recommendedForYou")} to="/cardapio" />
        <div className="mt-5">
          <DishRecommendationRow items={recommendedItems} />
        </div>
      </section>

      {/* Restrições alimentares */}
      <section className="mx-auto mt-12 max-w-6xl px-4 md:px-6">
        <DietaryPreferencesCard />
      </section>

      {/* Fast-food */}
      {fastFoodItems.length > 0 && (
        <section className="mx-auto mt-12 max-w-6xl px-4 md:px-6">
          <SectionHeading
            title={t("home.fastFood")}
            to="/cardapio"
            search={{ categoria: "Fast-food" }}
          />
          <div className="mt-5">
            <DishRecommendationRow items={fastFoodItems} />
          </div>
        </section>
      )}

      {/* Grelhados */}
      {grelhadosItems.length > 0 && (
        <section className="mx-auto mt-12 max-w-6xl px-4 md:px-6">
          <SectionHeading
            title={t("home.grilled")}
            to="/cardapio"
            search={{ categoria: "Grelhados" }}
          />
          <div className="mt-5">
            <DishRecommendationRow items={grelhadosItems} />
          </div>
        </section>
      )}

      {/* Em alta */}
      {trendingItems.length > 0 && (
        <section className="mx-auto mb-12 mt-12 max-w-6xl px-4 md:px-6">
          <SectionHeading title={t("home.trending")} to="/cardapio" />
          <div className="mt-5">
            <DishRecommendationRow items={trendingItems} />
          </div>
        </section>
      )}
    </PageShell>
  );
}
