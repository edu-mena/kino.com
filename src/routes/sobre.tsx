import { createFileRoute, Link } from "@tanstack/react-router";
import { Quote, Star, Store, UtensilsCrossed, Users } from "lucide-react";
import { useEffect, useState } from "react";
import cocaCap from "@/assets/cocacap.webp";
import dishDrink from "@/assets/dish-drink.png";
import icon from "@/assets/icon.png";
import { PageHeading, PageShell, SiteHeader } from "@/components/site-shell";
import { useTranslation } from "@/i18n";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre a Kino — quem somos" },
      {
        name: "description",
        content:
          "A Kino é o cardápio digital de Angola: quem está por trás, os números da plataforma e quem já confia na gente.",
      },
      { property: "og:title", content: "Sobre a Kino — quem somos" },
      {
        property: "og:description",
        content: "O cardápio digital que liga restaurantes e clientes em Angola.",
      },
      { property: "og:image", content: icon },
    ],
  }),
  component: Sobre,
});

const partners = [
  "Kino Grill",
  "Forno da Ilha",
  "Sabores de Luanda",
  "Doce Baía",
  "Talatona Sushi",
  "Maianga Grill",
  "Miramar Bistro",
  "Ilha Café",
];

function Sobre() {
  const [revealed, setRevealed] = useState(false);
  const { t } = useTranslation();

  const team = [
    { initials: "CR", name: "Christopher Rosinho", role: t("sobre.roleDirector") },
    { initials: "EM", name: "Eduardo Mena", role: t("sobre.roleProjectManager") },
  ];

  const stats = [
    { icon: Users, value: "12.000+", label: t("sobre.statActiveCustomers") },
    { icon: Store, value: "350+", label: t("sobre.statPartnerRestaurants") },
    { icon: UtensilsCrossed, value: "40 mil+", label: t("sobre.statMenuDishes") },
    { icon: Star, value: "4.8", label: t("sobre.statAverageRating") },
  ];

  const testimonials = [
    {
      initials: "CM",
      name: "Carla Mendes",
      role: t("sobre.testimonial1Role"),
      quote: t("sobre.testimonial1Quote"),
    },
    {
      initials: "JP",
      name: "João Paulo",
      role: t("sobre.testimonial2Role"),
      quote: t("sobre.testimonial2Quote"),
    },
    {
      initials: "IN",
      name: "Inês Neto",
      role: t("sobre.testimonial3Role"),
      quote: t("sobre.testimonial3Quote"),
    },
  ];

  useEffect(() => {
    const onScroll = () => setRevealed(window.scrollY > 150);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <PageShell header={<SiteHeader variant="guestHome" />} footer={null} showMobileTabBar={false}>
      {/* Coca-cola cap: same fixed/spinning treatment as the plate on /kino, but it
          stays off-screen to the right until the user scrolls, then slides in. */}
      <div
        className={`pointer-events-none fixed right-0 top-1/2 -z-20 -translate-y-1/2 transition-transform duration-700 ease-out ${
          revealed ? "translate-x-[30%]" : "translate-x-full"
        }`}
      >
        <img
          src={cocaCap}
          alt=""
          aria-hidden
          className="w-40 select-none animate-[spin_20s_linear_infinite] sm:w-56 md:w-64"
        />
      </div>

      <div className="mx-auto flex max-w-6xl flex-nowrap items-center justify-start px-4 md:px-6">
        <PageHeading
          eyebrow={t("sobre.eyebrow")}
          title={t("sobre.title")}
          description={t("sobre.description")}
          className="w-4/5 mx-0 max-w-none px-0 md:w-auto md:px-0"
        />
        <div className="w-1/5 shrink-0 overflow-hidden md:w-44 md:overflow-visible">
          <img
            src={dishDrink}
            alt=""
            aria-hidden
            className="relative -z-10 w-[130%] max-w-none translate-x-1 select-none object-contain md:w-44 md:translate-x-0"
          />
        </div>
      </div>

      {/* Team */}
      <section className="mx-auto mt-14 max-w-6xl px-4 md:px-6">
        <h2 className="text-2xl font-extrabold text-primary">{t("sobre.teamHeading")}</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {team.map((person) => (
            <div
              key={person.name}
              className="flex items-center gap-4 rounded-[2rem] border border-border bg-card p-6"
            >
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-primary font-display text-lg font-bold text-primary-foreground">
                {person.initials}
              </span>
              <div>
                <h3 className="font-display text-lg font-bold text-primary">{person.name}</h3>
                <p className="text-sm text-muted-foreground">{person.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto mt-14 max-w-6xl px-4 md:px-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-border bg-card p-5 text-left"
            >
              <stat.icon className="h-8 w-8 text-brand" />
              <p className="mt-4 font-display text-3xl font-extrabold text-primary">{stat.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Partners marquee */}
      <section className="mx-auto mt-14 max-w-6xl px-4 md:px-6">
        <h2 className="text-2xl font-extrabold text-primary">{t("sobre.partnersHeading")}</h2>
      </section>
      <div className="relative mt-5 overflow-hidden py-2 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        <div className="flex w-max animate-marquee gap-4">
          {[...partners, ...partners].map((name, i) => (
            <span
              key={`${name}-${i}`}
              className="shrink-0 rounded-full border border-border bg-card px-6 py-3 font-display text-sm font-bold tracking-wide text-primary"
            >
              {name}
            </span>
          ))}
        </div>
      </div>

      {/* Testimonials */}
      <section className="mx-auto mb-20 mt-14 max-w-6xl px-4 md:px-6">
        <h2 className="text-2xl font-extrabold text-primary">{t("sobre.testimonialsHeading")}</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {testimonials.map((item) => (
            <div
              key={item.name}
              className="flex flex-col rounded-[2rem] border border-border bg-card p-6"
            >
              <Quote className="h-6 w-6 text-brand" />
              <p className="mt-3 flex-1 text-sm text-foreground">{item.quote}</p>
              <div className="mt-5 flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface font-display text-sm font-bold text-primary">
                  {item.initials}
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Call to action — a página descreve a Kino mas, até aqui, não dava
          nenhum próximo passo; fecha com os mesmos dois caminhos usados
          em /kino (virar parceiro ou entrar como cliente). */}
      <section className="mx-auto mb-20 mt-14 max-w-6xl px-4 md:px-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col items-start gap-4 rounded-[2rem] bg-surface p-8 sm:p-10">
            <h2 className="font-display text-2xl font-extrabold text-primary sm:text-3xl">
              {t("kino.ctaRestaurantTitle")}
            </h2>
            <p className="max-w-sm text-muted-foreground">{t("kino.ctaRestaurantDescription")}</p>
            <Link
              to="/parceiros"
              className="mt-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90"
            >
              {t("sobre.becomePartner")}
            </Link>
          </div>

          <div className="flex flex-col items-start gap-4 rounded-[2rem] bg-primary p-8 text-primary-foreground sm:p-10">
            <h2 className="font-display text-2xl font-extrabold sm:text-3xl">
              {t("kino.ctaCustomerTitle")}
            </h2>
            <p className="max-w-sm text-primary-foreground/85">
              {t("kino.ctaCustomerDescription")}
            </p>
            <Link
              to="/entrar"
              className="mt-2 rounded-full bg-background px-6 py-3 text-sm font-semibold text-primary transition-opacity hover:opacity-90"
            >
              {t("kino.login")}
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
