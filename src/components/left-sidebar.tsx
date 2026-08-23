import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bike,
  CalendarCheck,
  Heart,
  Home,
  MapPin,
  Power,
  Search,
  Settings,
  User,
} from "lucide-react";
import { useState } from "react";
import { Logo } from "./logo";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { useTranslation } from "@/i18n";

/** Reaproveitado pelo bottombar mobile — mantém-se em 5 destinos lá, mesmo
 * a leftbar do desktop tendo mais opções (ver `desktopNavItems` abaixo).
 * `labelKey` aponta pro dicionário (`@/i18n`) — o rótulo muda com o idioma,
 * mas `to` é o path real, usado nas comparações de badge/estado ativo. */
export const tabs = [
  { to: "/", labelKey: "nav.home", icon: Home },
  { to: "/cardapio", labelKey: "nav.search", icon: Search },
  { to: "/entrega", labelKey: "nav.delivery", icon: Bike },
  { to: "/reservas", labelKey: "nav.reservations", icon: CalendarCheck },
  { to: "/perfil", labelKey: "nav.profile", icon: User },
] as const;

/** Só a leftbar do desktop usa esta lista maior — Restaurantes e Favoritos
 * não cabem/não fazem falta no bottombar mobile. */
const desktopNavItems = [
  { to: "/", labelKey: "nav.home", icon: Home },
  { to: "/cardapio", labelKey: "nav.search", icon: Search },
  { to: "/restaurantes", labelKey: "nav.restaurants", icon: MapPin },
  { to: "/entrega", labelKey: "nav.delivery", icon: Bike },
  { to: "/reservas", labelKey: "nav.reservations", icon: CalendarCheck },
  { to: "/favoritos", labelKey: "nav.favorites", icon: Heart },
  { to: "/perfil", labelKey: "nav.profile", icon: User },
] as const;

const navItemClass =
  "relative mx-2 flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-surface hover:text-primary xl:justify-start";

/**
 * Navegação principal do usuário logado no desktop — `fixed` (não `sticky`)
 * pra ficar completamente imune ao scroll da página, sem precisar de
 * overflow/scroll próprio (logo + nav + rodapé sempre cabem em `h-screen`).
 * `PageShell` compensa com `lg:ml-24 xl:ml-64` na coluna da direita, já que
 * a aside sai do fluxo normal.
 *
 * Logo grande no topo, nav centrada verticalmente, e um rodapé fixo com
 * Preferências + conta do usuário (com botão de terminar sessão ao lado) —
 * tudo isto é exclusivo daqui (desktop); o painel "três pontos" do mobile
 * continua com a sua própria versão, sem estas mudanças.
 */
export function LeftSidebar() {
  const { count } = useCart();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate({ to: "/entrar" });
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden h-screen w-24 flex-col border-r border-border bg-background py-6 lg:flex xl:w-64">
      <Link to="/" className="mx-auto shrink-0 px-2 pb-6 xl:mx-4">
        <Logo className="h-12 w-auto" />
      </Link>

      <nav className="flex flex-1 flex-col justify-center gap-2 overflow-y-auto">
        {desktopNavItems.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            activeOptions={{ exact: tab.to === "/" }}
            activeProps={{ className: "text-primary bg-surface" }}
            className={navItemClass}
          >
            <span className="relative mx-auto shrink-0 xl:mx-0">
              <tab.icon className="h-7 w-7" />
              {tab.to === "/entrega" && count > 0 && (
                <span className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-brand-foreground">
                  {count}
                </span>
              )}
            </span>
            <span className="hidden truncate xl:inline">{t(tab.labelKey)}</span>
          </Link>
        ))}
      </nav>

      <div className="mx-2 shrink-0 space-y-1 rounded-2xl bg-surface/80 p-1.5">
        <Link
          to="/preferencias"
          activeProps={{ className: "text-primary bg-card" }}
          className={`${navItemClass} mx-0`}
        >
          <span className="mx-auto shrink-0 xl:mx-0">
            <Settings className="h-7 w-7" />
          </span>
          <span className="hidden truncate xl:inline">{t("nav.preferences")}</span>
        </Link>

        {user && (
          <div className="flex items-center gap-1">
            <Link
              to="/perfil"
              activeProps={{ className: "text-primary bg-card" }}
              className={`${navItemClass} mx-0 flex-1`}
            >
              <span className="mx-auto grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary xl:mx-0">
                <User className="h-5 w-5" />
              </span>
              <span className="hidden truncate xl:inline">{user.name}</span>
            </Link>
            <button
              type="button"
              aria-label={t("logoutDialog.confirm")}
              onClick={() => setConfirmOpen(true)}
              className="hidden shrink-0 place-items-center rounded-lg p-2.5 text-muted-foreground transition-colors hover:bg-card hover:text-destructive xl:grid"
            >
              <Power className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-[1.5rem]">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("logoutDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("logoutDialog.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>
              {t("logoutDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
          <Link
            to="/ajuda"
            onClick={() => setConfirmOpen(false)}
            className="-mt-1 block text-center text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            {t("logoutDialog.helpLink")}
          </Link>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}
