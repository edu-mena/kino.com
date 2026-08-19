import { Link } from "@tanstack/react-router";
import { CalendarCheck, Home, Search, Settings, ShoppingCart, User } from "lucide-react";
import { Logo } from "./logo";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";

/** Também reaproveitado pelo bottombar mobile (mesmos 5 destinos). */
export const tabs = [
  { to: "/", label: "Início", icon: Home },
  { to: "/cardapio", label: "Buscar", icon: Search },
  { to: "/carrinho", label: "Pedidos", icon: ShoppingCart },
  { to: "/reservas", label: "Reservas", icon: CalendarCheck },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;

const navItemClass =
  "relative mx-2 flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium text-muted-foreground transition-colors hover:bg-surface hover:text-primary xl:justify-start";

/**
 * Navegação principal do usuário logado no desktop — `fixed` (não `sticky`)
 * pra ficar completamente imune ao scroll da página, sem precisar de
 * overflow/scroll próprio (logo + 5 tabs + rodapé sempre cabem em
 * `h-screen`). `PageShell` compensa com `lg:ml-24 xl:ml-64` na coluna da
 * direita, já que a aside sai do fluxo normal.
 *
 * Logo grande no topo, nav centrada verticalmente, e um rodapé fixo com
 * Configurações + conta do usuário — ambos removidos do header em telas
 * `lg:` pra cima (só existem aqui agora).
 */
export function LeftSidebar() {
  const { count } = useCart();
  const { user } = useAuth();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden h-screen w-24 flex-col border-r border-border bg-background py-6 lg:flex xl:w-64">
      <Link to="/" className="mx-auto shrink-0 px-2 pb-6 xl:mx-4">
        <Logo className="h-12 w-auto" />
      </Link>

      <nav className="flex flex-1 flex-col justify-center gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            to={tab.to}
            activeOptions={{ exact: tab.to === "/" }}
            activeProps={{ className: "text-primary bg-surface" }}
            className={navItemClass}
          >
            <span className="relative mx-auto shrink-0 xl:mx-0">
              <tab.icon className="h-7 w-7" />
              {tab.label === "Pedidos" && count > 0 && (
                <span className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-brand-foreground">
                  {count}
                </span>
              )}
            </span>
            <span className="hidden truncate xl:inline">{tab.label}</span>
          </Link>
        ))}
      </nav>

      <div className="shrink-0 space-y-1 border-t border-border pt-3">
        <Link
          to="/preferencias"
          activeProps={{ className: "text-primary bg-surface" }}
          className={navItemClass}
        >
          <span className="mx-auto shrink-0 xl:mx-0">
            <Settings className="h-7 w-7" />
          </span>
          <span className="hidden truncate xl:inline">Configurações</span>
        </Link>

        {user && (
          <Link to="/perfil" activeProps={{ className: "text-primary bg-surface" }} className={navItemClass}>
            <span className="mx-auto grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary xl:mx-0">
              <User className="h-5 w-5" />
            </span>
            <span className="hidden truncate xl:inline">{user.name}</span>
          </Link>
        )}
      </div>
    </aside>
  );
}
