import { createFileRoute } from "@tanstack/react-router";
import { Quote, Star, Store, UtensilsCrossed, Users } from "lucide-react";
import { useEffect, useState } from "react";
import cocaCap from "@/assets/cocacap.webp";
import dishDrink from "@/assets/dish-drink.png";
import icon from "@/assets/icon.png";
import { PageHeading, PageShell, SiteHeader } from "@/components/site-shell";

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

const team = [
  { initials: "SR", name: "Sebastião Rosinho", role: "Diretor" },
  { initials: "EM", name: "Eduardo Mena", role: "Gestor de Projeto" },
];

const stats = [
  { icon: Users, value: "12.000+", label: "Clientes ativos" },
  { icon: Store, value: "350+", label: "Restaurantes parceiros" },
  { icon: UtensilsCrossed, value: "40 mil+", label: "Pratos no cardápio" },
  { icon: Star, value: "4.8", label: "Avaliação média" },
];

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

const testimonials = [
  {
    initials: "CM",
    name: "Carla Mendes",
    role: "Cliente",
    quote:
      "Nunca mais liguei para reservar mesa. Vejo o cardápio, os preços e agendo tudo pela Kino.",
  },
  {
    initials: "JP",
    name: "João Paulo",
    role: "Dono do Forno da Ilha",
    quote:
      "Trocámos os cardápios de papel por um QR Code. Os clientes adoraram e nós poupamos tempo todos os dias.",
  },
  {
    initials: "IN",
    name: "Inês Neto",
    role: "Cliente",
    quote: "Personalizo o pedido do jeito que quero, sem trocas de mensagem. É simples assim.",
  },
];

function Sobre() {
  const [revealed, setRevealed] = useState(false);

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
          eyebrow="Sobre nós"
          title="O cardápio digital de Angola"
          description="A Kino nasceu em Luanda para ligar restaurantes e clientes num só lugar: pratos, preços, mesas e promoções, sempre à mão — sem ligações, sem cardápios de papel. Hoje a nossa ambição é maior: levar essa mesma experiência a restaurantes e clientes em todo o país."
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
        <h2 className="text-2xl font-extrabold text-primary">Quem está por trás</h2>
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
        <h2 className="text-2xl font-extrabold text-primary">Quem já está na Kino</h2>
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
        <h2 className="text-2xl font-extrabold text-primary">Testemunhos</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="flex flex-col rounded-[2rem] border border-border bg-card p-6"
            >
              <Quote className="h-6 w-6 text-brand" />
              <p className="mt-3 flex-1 text-sm text-foreground">{t.quote}</p>
              <div className="mt-5 flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface font-display text-sm font-bold text-primary">
                  {t.initials}
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
