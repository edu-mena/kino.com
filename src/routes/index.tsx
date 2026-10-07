import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Armchair, ArrowRight, Tag } from "lucide-react";
import { useMemo } from "react";
import { useTapSequence } from "@/lib/use-tap-sequence";
import heroBg from "@/assets/hero.webp";
import icon from "@/assets/icon.png";
import { CategoryShortcutRow } from "@/components/category-shortcut-row";
import { DietaryOnboardingPopup } from "@/components/dietary-onboarding-popup";
import { DishRecommendationRow } from "@/components/dish-recommendation-row";
import { HeaderSearch } from "@/components/header-search";
import { OnboardingTour, TutorialHint } from "@/components/onboarding-tour";
import { PackageTypeShortcutRow } from "@/components/package-type-shortcut-row";
import { PromoCarousel } from "@/components/promo-carousel";
import { RestaurantAvatarRow } from "@/components/restaurant-avatar-row";
import { PageShell, SiteHeader } from "@/components/site-shell";
import { getRestaurant } from "@/data/helpers";
import { useMenuItems } from "@/data/use-menu-items";
import { usePackageTypesWithOffers } from "@/data/use-package-types-query";
import { useAuth } from "@/lib/auth";
import { distanceFromDeviceKm } from "@/lib/geo";
import { useLocation } from "@/lib/location";
import { usePreferences } from "@/lib/preferences";
import {
  dishBehaviorScore,
  personalizedTopCategories,
  rankSectionDishes,
  rotationJitter,
  usePersonalization,
} from "@/lib/personalize";
import { byDishPopularity } from "@/lib/popularity";
import { buildRecommendedDishes } from "@/lib/recommend-dishes";
import { translateMenuCategory, useTranslation, type Locale } from "@/i18n";
import type { MenuItem } from "@/data/types";
import { useLiveCatalogVersion } from "@/data/live-catalog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Luku.com — Restaurantes de Angola: menu e reservas" },
      {
        name: "description",
        content:
          "Descubra os melhores restaurantes de Angola, veja o menu completo e reserve a sua mesa — tudo num só lugar.",
      },
      { property: "og:title", content: "Luku.com — Restaurantes de Angola: menu e reservas" },
      {
        property: "og:description",
        content: "Descubra onde jantar em Angola e reserve a sua mesa em segundos.",
      },
      { property: "og:image", content: icon },
    ],
  }),
  component: Home,
});

function Home() {
  const { isLoggedIn, user } = useAuth();

  // `isLoading` (evita mostrar a home errada — convidado ↔ logado — por um
  // instante antes do AuthProvider terminar de ler o localStorage) já é
  // tratado globalmente em `__root.tsx` (`AuthGate`), antes de qualquer
  // rota chegar a montar — por isto não precisa de ser checado aqui.
  if (isLoggedIn && user) {
    return <HomeLoggedIn />;
  }

  return <HomeNotLoggedIn />;
}

function HomeNotLoggedIn() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // Gesto escondido: 7 toques seguidos no card "Menus e novidades" abrem o
  // login de sistema (/sistema/entrar) — de propósito nunca linkado na UI
  // (ver sistema_.entrar.tsx). Ver use-tap-sequence.ts para o porquê do
  // desenho.
  const handleSystemLoginTap = useTapSequence(7, 800, () => navigate({ to: "/sistema/entrar" }));
  return (
    <PageShell header={<SiteHeader variant="guestHome" />} footer={null} showMobileTabBar={false}>
      <img
        src={heroBg}
        alt=""
        aria-hidden
        fetchPriority="high"
        decoding="async"
        className="pointer-events-none fixed right-0 top-0 -z-10 w-screen select-none md:h-screen md:object-cover"
      />

      <section className="mx-auto max-w-6xl px-4 pt-4 md:px-6 md:pt-4">
        <div className="max-w-xl mt-30 md:mt-0">
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] text-primary sm:text-5xl lg:text-6xl">
            {t("homeGuest.heroLine1")}
            <br />
            <span className="text-brand">{t("homeGuest.heroLine2")}</span>
          </h1>
          <p className="mt-4 text-[1.1rem] max-w-md text-muted-foreground">
            {t("homeGuest.subtitle")}
            <br />
            {t("homeGuest.subtitleBrandPrefix")}{" "}
            <Link to="/luku" viewTransition className="font-semibold text-brand hover:underline">
              Luku.com
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
              to="/luku"
              viewTransition
              className="rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary"
            >
              {t("homeGuest.whatIsLuku")}
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-5 max-w-6xl px-4 md:px-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            {
              id: "reserve",
              icon: Armchair,
              title: t("homeGuest.reserveTitle"),
              text: t("homeGuest.reserveText"),
            },
            {
              id: "offers",
              icon: Tag,
              title: t("homeGuest.offersTitle"),
              text: t("homeGuest.offersText"),
            },
          ].map((item) => (
            <div
              key={item.id}
              onClick={item.id === "offers" ? handleSystemLoginTap : undefined}
              className="rounded-2xl border border-border bg-card p-5 text-left"
            >
              <span className="grid h-11 w-11 place-items-center rounded-full border border-border bg-background text-brand">
                <item.icon className="h-5 w-5" />
              </span>
              <h2 className="mt-4 font-display text-base font-bold text-primary">{item.title}</h2>
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
  to?: "/cardapio" | "/restaurantes" | "/pacotes";
  search?: { categoria?: string | undefined };
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="min-w-0 truncate text-2xl font-extrabold text-primary">{title}</h2>
      {to && (
        <Link
          to={to}
          {...(search ? { search } : {})}
          className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-sm font-semibold text-brand"
        >
          {t("home.seeMore")} <ArrowRight className="h-4 w-4 shrink-0" />
        </Link>
      )}
    </div>
  );
}

function HomeLoggedIn() {
  const { t, locale } = useTranslation();
  const { items } = useMenuItems();
  // Restaurantes/pratos reais chegam da API depois do 1º render — os
  // helpers síncronos (getRestaurant...) leem-nos de live-catalog.
  const catalogVersion = useLiveCatalogVersion();
  const {
    cuisinePreferences,
    excludedIngredients,
    dietaryRestrictions,
    favoriteDishIds,
    favoriteIngredients,
  } = usePreferences();
  // "Perto de si" só existe com a localização do aparelho autorizada —
  // sem ela a linha de restaurantes é "Populares" e a distância não entra
  // nas recomendações (antes usava uma distância inventada).
  const { deviceCoords } = useLocation();
  const { data: packageTypes = [] } = usePackageTypesWithOffers();
  // "Algoritmo Luku": o histórico deste cliente (pesquisas, pratos vistos e
  // adicionados, pedidos) + a variação do dia — ver @/lib/personalize. Sem
  // histórico, a ordem é a geral (popularidade, nº de pratos).
  const { profile, seed } = usePersonalization(items);
  const getCuisine = (restaurantId: string) => getRestaurant(restaurantId)?.cuisine;

  // Secções de categoria: as que têm mais pratos, com as preferidas deste
  // cliente à frente; dentro de cada uma, mais pedidos + gosto pessoal, sem
  // vários seguidos do mesmo restaurante. Os pratos de restaurantes
  // inativos já vêm de fora (useMenuItems).
  const categorySections = useMemo(
    () =>
      personalizedTopCategories(items, profile).map((category) => ({
        category,
        items: rankSectionDishes(
          items.filter((m) => m.category === category),
          profile,
          seed,
          getCuisine,
        ),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- catalogVersion: getCuisine lê o catálogo real, que chega depois
    [items, profile, seed, catalogVersion],
  );
  const trendingItems = useMemo(
    () => items.filter((m) => m.isTrending || (m.orderCount ?? 0) > 0).sort(byDishPopularity),
    [items],
  );
  // "Recomendações": perto do usuário + cozinhas que ele prefere, evitando
  // empilhar vários pratos seguidos do mesmo restaurante (ver
  // `buildRecommendedDishes`) — nada disto entra quando há filtro manual
  // (é só o "sem filtro nenhum" da home).
  const recommendedItems = useMemo(
    () =>
      buildRecommendedDishes({
        items,
        getCuisine: (restaurantId) => getRestaurant(restaurantId)?.cuisine,
        distanceKmOf: (restaurantId) =>
          distanceFromDeviceKm(deviceCoords, getRestaurant(restaurantId)),
        cuisinePreferences,
        excludedIngredients,
        dietaryRestrictions,
        ownListReason: t("home.dishConflictOwnListReason"),
        favoriteItemIds: favoriteDishIds,
        favoriteIngredients,
        extraScore: (item) =>
          dishBehaviorScore(item, profile, getCuisine) + rotationJitter(seed, item.id) * 4,
        limit: 10,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- catalogVersion: getRestaurant() lê o catálogo real, que chega depois
    [
      items,
      deviceCoords,
      cuisinePreferences,
      excludedIngredients,
      dietaryRestrictions,
      favoriteDishIds,
      favoriteIngredients,
      profile,
      seed,
      t,
      catalogVersion,
    ],
  );

  return (
    <PageShell>
      <OnboardingTour />
      <TutorialHint />
      <DietaryOnboardingPopup />

      {/* Busca (mensagem de boas-vindas mudou pro header — ver SiteHeader) */}
      <section className="mx-auto max-w-6xl px-4 pt-3 md:px-6">
        <HeaderSearch />
      </section>

      {/* Promoções */}
      <section className="mx-auto mt-8 max-w-6xl px-4 md:px-6">
        <PromoCarousel />
      </section>

      {/* Restaurantes: "Perto de si" com localização, "Populares" sem ela */}
      <section className="mx-auto mt-12 max-w-6xl px-4 md:px-6">
        <SectionHeading
          title={deviceCoords ? t("home.restaurantsNearYou") : t("home.popularRestaurants")}
          to="/restaurantes"
        />
        <div className="mt-5">
          <RestaurantAvatarRow profile={profile} />
        </div>
      </section>

      {/* Recomendações */}
      <section className="mx-auto mt-12 max-w-6xl px-4 md:px-6">
        <SectionHeading title={t("home.recommendedForYou")} to="/cardapio" />
        <div className="mt-5">
          <DishRecommendationRow items={recommendedItems} />
        </div>
      </section>

      {/* Pacotes — só aparece com pelo menos um tipo com oferta ativa
          (ver usePackageTypesWithOffers), nunca uma secção vazia. */}
      {packageTypes.length > 0 && (
        <section className="mx-auto mt-12 max-w-6xl px-4 md:px-6">
          <SectionHeading title={t("home.packages")} to="/pacotes" />
          <div className="mt-5">
            <PackageTypeShortcutRow />
          </div>
        </section>
      )}

      {/* A maior categoria entre Pacotes e Categorias; as restantes depois */}
      {categorySections.slice(0, 1).map((section) => (
        <CategorySection key={section.category} {...section} locale={locale} />
      ))}

      {/* Categorias */}
      <section className="mx-auto mt-12 max-w-6xl px-4 md:px-6">
        <SectionHeading title={t("home.categories")} />
        <div className="mt-5">
          <CategoryShortcutRow items={items} profile={profile} />
        </div>
      </section>

      {categorySections.slice(1).map((section) => (
        <CategorySection key={section.category} {...section} locale={locale} />
      ))}

      {/* Em alta — só com pedidos reais (orderCount vem do catálogo da API) */}
      {trendingItems.length > 0 && (
        <section className="mx-auto mt-12 max-w-6xl px-4 md:px-6">
          <SectionHeading title={t("home.trending")} to="/cardapio" />
          <div className="mt-5">
            <DishRecommendationRow items={trendingItems} />
          </div>
        </section>
      )}
      <div className="mb-12" />
    </PageShell>
  );
}

/** Secção de uma categoria de pratos na home (as que têm mais pratos — ver
 * `topCategories`), com "ver mais" para o cardápio já filtrado. */
function CategorySection({
  category,
  items,
  locale,
}: {
  category: string;
  items: MenuItem[];
  locale: Locale;
}) {
  return (
    <section className="mx-auto mt-12 max-w-6xl px-4 md:px-6">
      <SectionHeading
        title={translateMenuCategory(category, locale)}
        to="/cardapio"
        search={{ categoria: category }}
      />
      <div className="mt-5">
        <DishRecommendationRow items={items} />
      </div>
    </section>
  );
}
