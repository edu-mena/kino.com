import { Link } from "@tanstack/react-router";
import { CalendarCheck, Home, Search, ShoppingCart, User } from "lucide-react";
import { Logo } from "./logo";
import { useCart } from "@/lib/cart";

/** Também reaproveitado pelo bottombar mobile (mesmos 5 destinos). */
export const tabs = [
  { to: "/", label: "Início", icon: Home },
  { to: "/cardapio", label: "Buscar", icon: Search },
  { to: "/carrinho", label: "Pedidos", icon: ShoppingCart },
  { to: "/reservas", label: "Reservas", icon: CalendarCheck },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;

/**
 * Navegação principal do usuário logado no desktop — coluna de altura
 * total (a página, incluindo o header, fica só na coluna da direita).
 * Logo no topo, nav centrada verticalmente no espaço restante. Mesmos 5
 * destinos do bottombar mobile; ícone+nome a partir de `xl:`, só ícone
 * entre `lg:` e `xl:`.
 */
export function LeftSidebar() {
  const { count } = useCart();

  return (
    <aside className="sticky top-0 hidden h-screen w-24 shrink-0 flex-col gap-1 overflow-y-auto border-r border-border bg-background py-6 lg:flex xl:w-64">
      <Link to="/" className="mx-auto shrink-0 px-2 pb-6 xl:mx-4">
        <Logo compact />
      </Link>

      <nav className="flex flex-1 flex-col justify-center gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            to={tab.to}
            activeOptions={{ exact: tab.to === "/" }}
            activeProps={{ className: "text-primary bg-surface" }}
            className="relative mx-2 flex items-center gap-3 rounded-xl px-3 py-3 text-base font-medium text-muted-foreground transition-colors hover:bg-surface hover:text-primary xl:justify-start"
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
    </aside>
  );
}
