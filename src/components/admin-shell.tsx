import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bike,
  CalendarCheck,
  LayoutGrid,
  LifeBuoy,
  LogOut,
  Megaphone,
  Menu,
  Soup,
  Sparkles,
  Star,
  Store,
  TrendingUp,
  User,
  Users,
  X,
} from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { Logo } from "./logo";
import { AdminOnboardingTour, AdminTutorialHint } from "./admin-onboarding-tour";
import { useTranslation } from "@/i18n";
import { AdminTutorialProvider, useAdminTutorial } from "@/lib/admin-tutorial";
import { useRestaurantAdmin } from "@/lib/restaurant-admin";

// `labelKey` também serve de `tourId` (data-tour="admin-<tourId>") — só
// orders/menu/reservations/promotions/restaurant têm passo no tour hoje,
// mas manter o atributo em todos evita ficar a decidir caso a caso.
const navItems = [
  { to: "/admin", labelKey: "dashboard", icon: LayoutGrid },
  { to: "/admin/pedidos", labelKey: "orders", icon: Bike },
  { to: "/admin/reservas", labelKey: "reservations", icon: CalendarCheck },
  { to: "/admin/cardapio", labelKey: "menu", icon: Soup },
  { to: "/admin/estatisticas", labelKey: "stats", icon: TrendingUp },
  { to: "/admin/clientes", labelKey: "customers", icon: Users },
  { to: "/admin/stories", labelKey: "stories", icon: Sparkles },
  { to: "/admin/promocoes", labelKey: "promotions", icon: Megaphone },
  { to: "/admin/avaliacoes", labelKey: "reviews", icon: Star },
  { to: "/admin/perfil", labelKey: "restaurant", icon: Store },
  { to: "/admin/suporte", labelKey: "support", icon: LifeBuoy },
] as const;

const mobileTabRoutes = new Set([
  "/admin",
  "/admin/pedidos",
  "/admin/reservas",
  "/admin/cardapio",
  "/admin/estatisticas",
]);

/** Só 5 itens cabem na barra inferior do mobile (grid fixo) — os restantes
 * ficam no painel "mais opções" do topo mobile, junto do logout. */
const mobileTabItems = navItems.filter((item) => mobileTabRoutes.has(item.to));
const mobileOverflowItems = navItems.filter((item) => !mobileTabRoutes.has(item.to));

/**
 * Casca do painel do restaurante — equivalente ao `PageShell` do lado do
 * cliente, mas completamente à parte: sessão própria (`useRestaurantAdmin`,
 * nada a ver com `useAuth`), navegação própria, sem footer/tabbar de
 * cliente. Mesma linguagem visual (card-soft, cores primary/brand) para
 * manter consistência entre as duas partes da app.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const { managedRestaurantId, restaurant, hydrated } = useRestaurantAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (hydrated && !managedRestaurantId) {
      navigate({ to: "/admin/entrar" });
    }
  }, [hydrated, managedRestaurantId, navigate]);

  if (!managedRestaurantId || !restaurant) return null;

  // O provider do tour só existe depois de confirmada a sessão — sem isso o
  // tour tentaria abrir para quem ainda vai ser mandado para /admin/entrar.
  return (
    <AdminTutorialProvider>
      <AdminShellContent>{children}</AdminShellContent>
    </AdminTutorialProvider>
  );
}

function AdminShellContent({ children }: { children: ReactNode }) {
  const { restaurant, logout } = useRestaurantAdmin();
  const navigate = useNavigate();
  const { mobileMenuOpen: mobileOpen, setMobileMenuOpen: setMobileOpen } = useAdminTutorial();
  const { t } = useTranslation();

  if (!restaurant) return null;

  const handleLogout = () => {
    logout();
    navigate({ to: "/admin/entrar" });
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar — desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden h-screen w-24 flex-col border-r border-border bg-background py-6 lg:flex xl:w-64">
        <Link to="/admin" className="mx-auto shrink-0 px-2 pb-6 xl:mx-4">
          <Logo className="h-12 w-auto" />
        </Link>

        <nav className="flex flex-1 flex-col gap-2 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              data-tour={`admin-${item.labelKey}`}
              activeOptions={{ exact: item.to === "/admin" }}
              activeProps={{ className: "text-primary bg-surface" }}
              className="relative mx-2 flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-surface hover:text-primary xl:justify-start"
            >
              <item.icon className="mx-auto h-6 w-6 shrink-0 xl:mx-0" />
              <span className="hidden truncate xl:inline">{t(`adminNav.${item.labelKey}`)}</span>
            </Link>
          ))}
        </nav>

        <div className="mx-2 shrink-0 space-y-1 rounded-2xl bg-surface/80 p-1.5">
          <div className="flex items-center gap-1">
            <div className="flex flex-1 items-center gap-3 rounded-xl px-3 py-3">
              <span className="mx-auto grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/15 text-primary xl:mx-0">
                <img src={restaurant.coverImage} alt="" className="h-full w-full object-cover" />
              </span>
              <span className="hidden min-w-0 truncate text-xs font-bold text-foreground xl:inline">
                {restaurant.name}
              </span>
            </div>
            <button
              type="button"
              aria-label={t("adminNav.logout")}
              onClick={handleLogout}
              className="hidden shrink-0 place-items-center rounded-lg p-2.5 text-muted-foreground transition-colors hover:bg-card hover:text-destructive xl:grid"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:ml-24 xl:ml-64">
        {/* Top bar — mobile */}
        <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-border bg-white px-4 py-3 lg:hidden">
          <Link to="/admin" className="flex min-w-0 items-center gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-surface">
              <img src={restaurant.coverImage} alt="" className="h-full w-full object-cover" />
            </span>
            <span className="min-w-0 truncate text-sm font-bold text-primary">
              {restaurant.name}
            </span>
          </Link>
          <button
            type="button"
            data-tour="admin-nav-menu"
            aria-label={mobileOpen ? t("adminNav.closeMenu") : t("adminNav.openMenu")}
            onClick={() => setMobileOpen(!mobileOpen)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-card text-foreground"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </header>

        {mobileOpen && (
          <div className="border-b border-border bg-card px-4 py-3 lg:hidden">
            {mobileOverflowItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                data-tour={`admin-${item.labelKey}`}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 rounded-lg px-2 py-3 text-sm font-medium text-foreground hover:bg-surface"
              >
                <item.icon className="h-4 w-4 shrink-0 text-primary" />
                {t(`adminNav.${item.labelKey}`)}
              </Link>
            ))}
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left text-sm font-medium text-destructive hover:bg-destructive/5"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {t("adminNav.logout")}
            </button>
          </div>
        )}

        <main className="min-w-0 flex-1 pb-20 lg:pb-12">{children}</main>
      </div>

      {/* Barra inferior — mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur lg:hidden">
        <div className="grid grid-cols-5">
          {mobileTabItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              data-tour={`admin-${item.labelKey}`}
              activeOptions={{ exact: item.to === "/admin" }}
              activeProps={{ className: "text-primary" }}
              className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground"
            >
              <item.icon className="h-5 w-5" />
              {t(`adminNav.${item.labelKey}`)}
            </Link>
          ))}
        </div>
      </nav>

      <AdminOnboardingTour />
      <AdminTutorialHint />
    </div>
  );
}

export function AdminPageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-4 px-4 pt-8 md:px-6">
      <div>
        {eyebrow && (
          <p className="text-sm font-semibold uppercase tracking-widest text-brand">{eyebrow}</p>
        )}
        <h1 className="mt-2 text-3xl font-extrabold text-primary sm:text-4xl">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
