import { createFileRoute, Link } from "@tanstack/react-router";
import { Armchair, ArrowRight, Bike, Clock, Search, Tag, UtensilsCrossed } from "lucide-react";
import heroBg from "@/assets/hero.png";
import icon from "@/assets/icon.png";
import { DishCarousel } from "@/components/dish-carousel";
import { PageShell, SiteHeader } from "@/components/site-shell";
import { DishGrid } from "@/components/dish-grid";
import { useAuth } from "@/lib/auth";
import {
  categories,
  dishes,
  formatKz,
  gridDishes,
  offers,
  promoDishes,
  restaurants,
} from "@/lib/mock-data";

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
  const { isLoggedIn, user } = useAuth();

  if (isLoggedIn && user) {
    return <HomeLoggedIn user={user} />;
  }

  return <HomeNotLoggedIn />;
}

function HomeNotLoggedIn() {
  return (
    <PageShell header={<SiteHeader variant="guestHome" />} footer={null} showMobileTabBar={false}>
      <img
        src={heroBg}
        alt=""
        aria-hidden
        className="pointer-events-none fixed right-0 top-0 -z-10 w-screen select-none md:h-screen md:object-cover"
      />

      <section className="mx-auto max-w-6xl px-4 pt-8 md:px-6 md:pt-14">
        <div className="max-w-xl mt-30 md:mt-0">
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] text-primary sm:text-5xl lg:text-6xl">
            Então,
            <br />
            <span className="text-brand">Hoje é aonde</span>?
          </h1>
          <p className="mt-4 text-[1.1rem] max-w-md text-muted-foreground">
            A Melhor escolha à distância de um click!! <br/>
            <span className="text-brand">Kino.com</span> o teu cardápio online.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              to="/entrar"
              className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Fazer Login
            </Link>
            <Link
              to="/kino"
              viewTransition
              className="rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary"
            >
              O que é a Kino?
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-6xl px-4 md:px-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { icon: Armchair, title: "Reserve uma mesa", text: "Reserve sua mesa com facilidade." },
            { icon: Tag, title: "Ofertas exclusivas", text: "Descontos especiais só para você." },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-border bg-card p-5 text-left">
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

function HomeLoggedIn({ user }: { user: { name: string; email: string } }) {
  return (
    <PageShell>
      {/* Welcome Section */}
      <section className="mx-auto max-w-6xl px-4 pt-8 md:px-6 md:pt-14">
        <div className="rounded-2xl bg-gradient-to-r from-primary to-brand p-8 text-primary-foreground">
          <h1 className="text-3xl font-extrabold sm:text-4xl">
            Bem-vindo de volta, <span className="capitalize">{user.name}</span>! 👋
          </h1>
          <p className="mt-2 text-primary-foreground/90">
            O que quer pedir hoje? Escolha entre seus restaurantes favoritos ou explore novidades.
          </p>
          <Link
            to="/cardapio"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-background px-6 py-3 font-semibold text-primary transition-opacity hover:opacity-90"
          >
            <Search className="h-4 w-4" />
            Buscar pratos
          </Link>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="mx-auto mt-12 max-w-6xl px-4 md:px-6">
        <h2 className="text-2xl font-extrabold text-primary">Atalhos rápidos</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Link
            to="/cardapio"
            className="card-soft flex flex-col items-start gap-3 p-5 transition-colors hover:border-brand"
          >
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand/15 text-brand">
              <Search className="h-5 w-5" />
            </span>
            <h3 className="font-semibold text-foreground">Novo pedido</h3>
            <p className="text-sm text-muted-foreground">Explore o cardápio</p>
          </Link>
          
          <Link
            to="/acompanhar"
            className="card-soft flex flex-col items-start gap-3 p-5 transition-colors hover:border-brand"
          >
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
              <Bike className="h-5 w-5" />
            </span>
            <h3 className="font-semibold text-foreground">Acompanhar</h3>
            <p className="text-sm text-muted-foreground">Ver pedido em tempo real</p>
          </Link>
          
          <Link
            to="/perfil"
            className="card-soft flex flex-col items-start gap-3 p-5 transition-colors hover:border-brand"
          >
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-success/15 text-success">
              <Clock className="h-5 w-5" />
            </span>
            <h3 className="font-semibold text-foreground">Meu perfil</h3>
            <p className="text-sm text-muted-foreground">Gerenciar dados</p>
          </Link>
        </div>
      </section>

      {/* Recommended */}
      <section className="mx-auto mt-16 max-w-6xl px-4 md:px-6">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-extrabold text-primary">Recomendados para você</h2>
          <Link
            to="/cardapio"
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand"
          >
            Ver mais <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-5">
          <DishCarousel dishes={dishes.slice(0, 8)} />
        </div>
      </section>

      {/* Promos */}
      <section className="mx-auto mt-16 max-w-6xl px-4 md:px-6">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-extrabold text-primary">Em Promoção</h2>
          <Link
            to="/ofertas"
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand"
          >
            Ver ofertas <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-5">
          <DishCarousel dishes={promoDishes.slice(0, 8)} reverse />
        </div>
      </section>

      {/* Favorites */}
      <section className="mx-auto mt-16 max-w-6xl px-4 md:px-6">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-extrabold text-primary">Seus favoritos</h2>
          <Link
            to="/cardapio"
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand"
          >
            Ver mais <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-5">
          <DishGrid dishes={gridDishes.slice(0, 8)} />
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto mt-16 max-w-6xl px-4 md:px-6">
        <h2 className="text-2xl font-extrabold text-primary">Procurar por categoria</h2>
        <div className="no-scrollbar mt-5 flex gap-4 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to="/cardapio"
              search={{ categoria: cat.id }}
              className="card-soft flex w-32 shrink-0 flex-col items-center gap-2 p-4 transition-colors hover:border-brand"
            >
              <img
                src={cat.image}
                alt={cat.label}
                loading="lazy"
                className="h-16 w-16 object-contain"
              />
              <span className="text-sm font-semibold text-foreground">{cat.label}</span>
            </Link>
          ))}
        </div>
      </section>
    </PageShell>
  );
}