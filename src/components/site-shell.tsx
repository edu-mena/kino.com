import { Link, useNavigate } from "@tanstack/react-router";
import {
  CalendarCheck,
  ChevronDown,
  CircleHelp,
  Heart,
  Home,
  LogOut,
  MapPin,
  Menu,
  MoreVertical,
  Navigation,
  Search,
  Settings,
  ShoppingCart,
  User,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { LeftSidebar, tabs } from "./left-sidebar";
import { Logo } from "./logo";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const navLinks = [
  { to: "/", label: "Início" },
  { to: "/restaurantes", label: "Restaurantes" },
  { to: "/cardapio", label: "Cardápio" },
  { to: "/ofertas", label: "Ofertas" },
  { to: "/sobre", label: "Sobre nós" },
] as const;

/** Links do usuário logado — mostrados no painel "três pontos" do header. */
const appNavLinks = [
  { to: "/", label: "Início", icon: Home },
  { to: "/cardapio", label: "Cardápio", icon: Search },
  { to: "/restaurantes", label: "Restaurantes", icon: MapPin },
  { to: "/carrinho", label: "Pedidos", icon: ShoppingCart },
  { to: "/reservas", label: "Reservas", icon: CalendarCheck },
  { to: "/favoritos", label: "Favoritos", icon: Heart },
  { to: "/preferencias", label: "Preferências", icon: Settings },
  { to: "/ajuda", label: "Ajuda", icon: CircleHelp },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;

const guestNavLinks = [
  { to: "/", label: "Início" },
  { to: "/kino", label: "Kino" },
  { to: "/sobre", label: "Sobre nós" },
  { to: "/contacto", label: "Contacto" },
] as const;

const guestNavOrder = guestNavLinks.map((link) => link.to as string);

/** "Bom dia"/"Boa tarde"/"Boa noite" conforme a hora local. */
function greetingForHour(hour: number) {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

/** Ex: "quarta-feira, 19 de agosto" — capitalizado. */
function formatTodayPt(date: Date) {
  const text = date.toLocaleDateString("pt-AO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Slides "forward" (left) when moving right along the guest nav order
// (e.g. Início -> Kino), "back" (right) when moving left (e.g. Kino -> Início).
// Matched by the html:active-view-transition-type(back) rule in styles.css.
function guestViewTransitionTypes({
  fromLocation,
  toLocation,
}: {
  fromLocation?: { pathname: string };
  toLocation: { pathname: string };
}) {
  const fromIndex = fromLocation ? guestNavOrder.indexOf(fromLocation.pathname) : -1;
  const toIndex = guestNavOrder.indexOf(toLocation.pathname);
  if (fromIndex === -1 || toIndex === -1 || toIndex >= fromIndex) return ["forward"];
  return ["back"];
}

function CartButton() {
  const { count } = useCart();
  return (
    <Link
      to="/carrinho"
      aria-label="Ver carrinho"
      className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-card text-foreground transition-colors hover:border-primary"
    >
      <ShoppingCart className="h-4 w-4" />
      {count > 0 && (
        <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[11px] font-bold text-brand-foreground">
          {count}
        </span>
      )}
    </Link>
  );
}

export function SiteHeader({ variant = "default" }: { variant?: "default" | "guestHome" } = {}) {
  const [open, setOpen] = useState(false);
  const [usingCurrentLocation, setUsingCurrentLocation] = useState(false);
  const { isLoggedIn, user, logout } = useAuth();
  const navigate = useNavigate();
  const isGuestHome = variant === "guestHome";
  // Logged-in users get the "all links" panel at every width, not just mobile.
  const panelAlwaysAvailable = isLoggedIn && !isGuestHome;
  const panelLinks = isGuestHome ? guestNavLinks : isLoggedIn ? appNavLinks : navLinks;

  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (!isGuestHome) return;
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isGuestHome]);

  // Lock page scroll while the mobile menu overlay is open.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  // Logado (fora da home de convidado): header realmente `fixed`, não só
  // `sticky` — alinhado ao lado direito da leftbar fixa (LeftSidebar).
  const isFixedDashboardHeader = isLoggedIn && !isGuestHome;

  return (
    <header
      className={cn(
        "z-40 border-b transition-colors duration-300",
        isFixedDashboardHeader
          ? "fixed inset-x-0 top-0 h-16 lg:left-24 xl:left-64"
          : "sticky top-0",
        isGuestHome
          ? scrolled
            ? "border-border/70 bg-white"
            : "border-transparent bg-transparent"
          : "border-border/70 bg-background/85 backdrop-blur",
      )}
      style={isGuestHome ? { viewTransitionName: "guest-header" } : undefined}
    >
      <div
        className={cn(
          "mx-auto grid max-w-6xl items-center gap-3 px-4 py-3 md:px-6",
          isGuestHome ? "grid-cols-[auto_1fr_auto]" : "grid-cols-[minmax(0,1fr)_auto]",
        )}
      >
        <div className={cn("flex min-w-0 items-center", isGuestHome ? "" : "gap-8")}>
          <Link to="/" className={cn("shrink-0", isFixedDashboardHeader && "lg:hidden")}>
            <Logo />
          </Link>
          {isFixedDashboardHeader && user && (
            <div className="hidden min-w-0 lg:block">
              <p className="truncate text-sm font-bold text-primary">
                {greetingForHour(new Date().getHours())}, <span className="capitalize">{user.name}</span> 👋
              </p>
              <p className="truncate text-xs text-muted-foreground">{formatTodayPt(new Date())}</p>
            </div>
          )}
          {!isGuestHome && !isLoggedIn && (
            <nav className="hidden items-center gap-6 lg:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  activeOptions={{ exact: link.to === "/" }}
                  activeProps={{
                    className: "text-primary after:w-full",
                  }}
                  className="relative py-1 text-sm font-medium text-muted-foreground transition-colors after:absolute after:-bottom-0.5 after:left-0 after:h-0.5 after:w-0 after:bg-brand after:transition-all hover:text-primary"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          )}
        </div>

        {isGuestHome && (
          <nav className="hidden w-fit items-center justify-self-center gap-6 rounded-[20rem] bg-white px-12 py-3 lg:flex">
            {guestNavLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                viewTransition={{ types: guestViewTransitionTypes }}
                activeOptions={{ exact: link.to === "/" }}
                activeProps={{
                  className: "text-primary after:w-full guest-nav-active",
                }}
                className="relative py-1 text-sm font-medium text-muted-foreground transition-colors after:absolute after:-bottom-0.5 after:left-0 after:h-0.5 after:w-0 after:bg-brand after:transition-all hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="flex shrink-0 items-center gap-2 justify-self-end">
          {!isGuestHome && (
            <button
              type="button"
              onClick={() => setUsingCurrentLocation((v) => !v)}
              className="hidden items-center gap-1 rounded-xl bg-surface px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-primary md:flex"
            >
              {usingCurrentLocation ? (
                <Navigation className="h-3.5 w-3.5 text-primary" />
              ) : (
                <MapPin className="h-3.5 w-3.5 text-primary" />
              )}
              {usingCurrentLocation ? "Localização atual" : "Luanda, Angola"}
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          )}
          {!isGuestHome && <CartButton />}

          {isLoggedIn && user ? (
            <div className="hidden items-center gap-2 sm:flex lg:hidden">
              <span className="text-sm font-medium text-muted-foreground">
                {user.name}
              </span>
              <Link
                to="/perfil"
                className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-card text-foreground transition-colors hover:border-primary"
                aria-label="Perfil"
              >
                <User className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <Link
              to="/entrar"
              className="hidden rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:block"
            >
              Entrar
            </Link>
          )}
          
          <button
            type="button"
            aria-label={panelAlwaysAvailable ? "Mais opções" : "Abrir menu"}
            onClick={() => setOpen((v) => !v)}
            className={cn(
              "grid h-10 w-10 place-items-center rounded-xl",
              !panelAlwaysAvailable && "lg:hidden",
              isGuestHome
                ? "bg-brand text-brand-foreground"
                : "border border-border bg-card text-foreground",
            )}
          >
            {open ? (
              <X className="h-4 w-4" />
            ) : panelAlwaysAvailable ? (
              <MoreVertical className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Backdrop */}
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 transition-opacity duration-300",
          !panelAlwaysAvailable && "lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      {/* Menu overlay — mobile-only for guests, available at every width once logged in */}
      <nav
        className={cn(
          "fixed right-0 top-0 z-50 flex h-[100vh] w-full max-w-xs flex-col border-l border-border bg-card shadow-2xl transition-transform duration-300 ease-in-out",
          !panelAlwaysAvailable && "lg:hidden",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {panelLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              {...(isGuestHome ? { viewTransition: { types: guestViewTransitionTypes } } : {})}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-lg px-2 py-3 text-lg font-medium text-foreground hover:bg-surface"
            >
              {"icon" in link && <link.icon className="h-4 w-4 shrink-0 text-primary" />}
              {link.label}
            </Link>
          ))}
        </div>

        <div className="shrink-0 border-t border-border px-4 py-3">
          {isLoggedIn ? (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                logout();
                navigate({ to: "/entrar" });
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-surface px-4 py-3 text-center text-lg font-semibold text-destructive"
            >
              <LogOut className="h-4 w-4" /> Terminar sessão
            </button>
          ) : (
            <Link
              to="/entrar"
              onClick={() => setOpen(false)}
              className="mb-20 block rounded-xl bg-primary px-4 py-3 text-center text-lg font-semibold text-primary-foreground"
            >
              Entrar
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}

export function MobileTabBar() {
  const { count } = useCart();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur md:hidden">
      <div className="grid grid-cols-5">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            to={tab.to}
            activeOptions={{ exact: tab.to === "/" }}
            activeProps={{ className: "text-primary" }}
            className="relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground"
          >
            <tab.icon className="h-5 w-5" />
            {tab.label === "Pedidos" && count > 0 && (
              <span className="absolute right-1/2 top-1 translate-x-4 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-brand-foreground">
                {count}
              </span>
            )}
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border bg-card">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-[1.5fr_1fr_1fr] md:px-6">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Comer bem, ficou fácil. Pedidos de comida online em Luanda, entregues em minutos.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">Navegar</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {navLinks.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="hover:text-primary">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">Conta</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/perfil" className="hover:text-primary">
                Meu perfil
              </Link>
            </li>
            <li>
              <Link to="/acompanhar" className="hover:text-primary">
                Acompanhar pedido
              </Link>
            </li>
            <li>
              <Link to="/ajuda" className="hover:text-primary">
                Centro de ajuda
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border px-4 py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Kino.com · Demonstração com dados fictícios
      </div>
    </footer>
  );
}

export function PageShell({
  children,
  header,
  footer,
  showMobileTabBar = true,
}: {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  showMobileTabBar?: boolean;
}) {
  const { isLoggedIn } = useAuth();
  return (
    <div className="flex min-h-screen">
      {isLoggedIn && <LeftSidebar />}
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col",
          isLoggedIn && "lg:ml-24 xl:ml-64",
        )}
      >
        {header ?? <SiteHeader />}
        <main
          className={cn(
            "min-w-0 flex-1",
            isLoggedIn && "pt-16",
            showMobileTabBar && "pb-20 md:pb-0",
          )}
        >
          {children}
        </main>
        {footer === undefined ? <SiteFooter /> : footer}
      </div>
      {showMobileTabBar && <MobileTabBar />}
    </div>
  );
}

export function PageHeading({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto max-w-6xl px-4 pt-10 md:px-6", className)}>
      {eyebrow && (
        <p className="text-sm font-semibold uppercase tracking-widest text-brand">{eyebrow}</p>
      )}
      <h1 className="mt-2 text-3xl font-extrabold text-primary sm:text-4xl">{title}</h1>
      {description && <p className="mt-3 max-w-2xl text-muted-foreground">{description}</p>}
    </div>
  );
}