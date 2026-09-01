import { Link, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  Bike,
  CreditCard,
  Inbox,
  LayoutGrid,
  LifeBuoy,
  LogOut,
  Megaphone,
  Menu,
  ShieldCheck,
  Store,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Logo } from "./logo";
import { useTranslation } from "@/i18n";
import { useSystemAdmin } from "@/lib/system-admin";

const navItems = [
  { to: "/sistema", labelKey: "overview", icon: LayoutGrid },
  { to: "/sistema/restaurantes", labelKey: "restaurants", icon: Store },
  { to: "/sistema/operacao", labelKey: "operations", icon: Activity },
  { to: "/sistema/subscricoes", labelKey: "subscriptions", icon: CreditCard },
  { to: "/sistema/parceiros", labelKey: "partners", icon: Inbox },
  { to: "/sistema/promocoes", labelKey: "promotions", icon: Megaphone },
  { to: "/sistema/frota", labelKey: "fleet", icon: Bike },
  { to: "/sistema/suporte", labelKey: "support", icon: LifeBuoy },
] as const;

const mobileTabRoutes = new Set([
  "/sistema",
  "/sistema/restaurantes",
  "/sistema/operacao",
  "/sistema/subscricoes",
]);
const mobileTabItems = navItems.filter((i) => mobileTabRoutes.has(i.to));
const mobileOverflowItems = navItems.filter((i) => !mobileTabRoutes.has(i.to));

/**
 * Casca da área de administração de sistema (`/sistema/*`) — equivalente ao
 * `AdminShell` do painel do restaurante, com sessão própria
 * (`useSystemAdmin`) e navegação própria. Mesma linguagem visual.
 */
export function SystemShell({ children }: { children: ReactNode }) {
  const { operatorId, operator, hydrated, logout } = useSystemAdmin();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (hydrated && !operatorId) navigate({ to: "/sistema/entrar" });
  }, [hydrated, operatorId, navigate]);

  if (!operatorId || !operator) return null;

  const handleLogout = () => {
    logout();
    navigate({ to: "/sistema/entrar" });
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar — desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden h-screen w-24 flex-col border-r border-border bg-background py-6 lg:flex xl:w-64">
        <Link to="/sistema" className="mx-auto shrink-0 px-2 pb-4 xl:mx-4">
          <Logo className="h-12 w-auto" />
        </Link>
        <div className="mx-auto mb-4 hidden items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-primary xl:mx-4 xl:flex">
          <ShieldCheck className="h-3.5 w-3.5" />
          {t("sistema.shellBadge")}
        </div>

        <nav className="flex flex-1 flex-col gap-2 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/sistema" }}
              activeProps={{ className: "text-primary bg-surface" }}
              className="relative mx-2 flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-surface hover:text-primary xl:justify-start"
            >
              <item.icon className="mx-auto h-6 w-6 shrink-0 xl:mx-0" />
              <span className="hidden truncate xl:inline">{t(`sistema.nav.${item.labelKey}`)}</span>
            </Link>
          ))}
        </nav>

        <div className="mx-2 shrink-0 space-y-1 rounded-2xl bg-surface/80 p-1.5">
          <div className="flex items-center gap-1">
            <div className="flex flex-1 items-center gap-3 rounded-xl px-3 py-3">
              <span className="mx-auto grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary xl:mx-0">
                {operator.name
                  .split(" ")
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")}
              </span>
              <span className="hidden min-w-0 truncate text-xs font-bold text-foreground xl:inline">
                {operator.name}
              </span>
            </div>
            <button
              type="button"
              aria-label={t("sistema.logout")}
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
          <Link to="/sistema" className="flex min-w-0 items-center gap-2">
            <Logo className="h-8 w-auto" />
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
              {t("sistema.shellBadge")}
            </span>
          </Link>
          <button
            type="button"
            aria-label={mobileOpen ? t("sistema.closeMenu") : t("sistema.openMenu")}
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
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 rounded-lg px-2 py-3 text-sm font-medium text-foreground hover:bg-surface"
              >
                <item.icon className="h-4 w-4 shrink-0 text-primary" />
                {t(`sistema.nav.${item.labelKey}`)}
              </Link>
            ))}
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left text-sm font-medium text-destructive hover:bg-destructive/5"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {t("sistema.logout")}
            </button>
          </div>
        )}

        <main className="min-w-0 flex-1 pb-20 lg:pb-12">{children}</main>
      </div>

      {/* Barra inferior — mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur lg:hidden">
        <div className="grid grid-cols-4">
          {mobileTabItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/sistema" }}
              activeProps={{ className: "text-primary" }}
              className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground"
            >
              <item.icon className="h-5 w-5" />
              {t(`sistema.nav.${item.labelKey}`)}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function SystemPageHeading({
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
