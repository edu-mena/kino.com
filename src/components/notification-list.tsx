import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { RestaurantRecommendationsDialog } from "@/components/restaurant-recommendations-dialog";
import { useRestaurants } from "@/data/use-restaurants-query";
import { useTranslation } from "@/i18n";
import type { LukuNotification } from "@/lib/notifications";

const targetFor = (scope: "client" | "restaurant", kind: LukuNotification["kind"]) =>
  scope === "client" ? (kind === "order" ? "/entrega" : "/reservas") : null;

/** Uma notificação, lida ou não — usado tanto no sino (só não lidas) como
 * nas páginas de histórico (`/notificacoes`, `/admin/notificacoes`). */
export function NotificationList({
  items,
  scope,
  emptyText,
  onNavigate,
}: {
  items: LukuNotification[];
  scope: "client" | "restaurant";
  emptyText: string;
  /** Chamado ao navegar a partir de uma notificação — o sino usa isto para se fechar. */
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();
  const { data: restaurants = [] } = useRestaurants();
  const restaurantById = useMemo(() => new Map(restaurants.map((r) => [r.id, r])), [restaurants]);
  // Notificação de pedido recusado cujo "ver recomendações" está aberto —
  // mesmo popup usado no card de pedido/página do restaurante (ver
  // `RestaurantRecommendationsDialog`), para as sugestões nunca divergirem
  // conforme onde aparecem.
  const [recFor, setRecFor] = useState<LukuNotification | null>(null);
  const recRestaurant = recFor ? restaurantById.get(recFor.restaurantId) : undefined;

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (items.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <>
      <ul className="divide-y divide-border">
        {items.map((n) => {
          const name = restaurantById.get(n.restaurantId)?.name ?? "";
          const to = n.kind === "restaurant" ? null : targetFor(scope, n.kind);
          // Pedido recusado — o resto da app já trata isto (ver
          // `order-builder-card.tsx`/`restaurantes_.$id.tsx`), a notificação
          // é só mais um sítio de onde chegar às mesmas sugestões.
          const showRecommend = scope === "client" && n.kind === "order" && n.status === "rejected";
          const body = (
            <>
              <span className="flex items-start gap-2">
                {!n.read && (
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand"
                    aria-hidden="true"
                  />
                )}
                <span
                  className={`block min-w-0 text-sm ${
                    n.read ? "text-muted-foreground" : "font-semibold text-foreground"
                  }`}
                >
                  {t(`notifications.${n.event}`, { name, status: n.status })}
                </span>
              </span>
              <span className="mt-0.5 block pl-3.5 text-[11px] text-muted-foreground">
                {fmt(n.at)}
              </span>
            </>
          );
          return (
            <li key={n.id}>
              {n.kind === "restaurant" && n.restaurantId ? (
                <Link
                  to="/restaurantes/$id"
                  params={{ id: n.restaurantId }}
                  onClick={onNavigate}
                  className="block px-4 py-2.5 hover:bg-surface"
                >
                  {body}
                </Link>
              ) : to ? (
                <Link to={to} onClick={onNavigate} className="block px-4 py-2.5 hover:bg-surface">
                  {body}
                </Link>
              ) : (
                <div className="px-4 py-2.5">{body}</div>
              )}
              {showRecommend && (
                <button
                  type="button"
                  onClick={() => setRecFor(n)}
                  className="block px-4 pb-2.5 pl-[1.625rem] text-xs font-semibold text-primary hover:underline"
                >
                  {t("restaurantRecommendations.seeAlternatives")}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {recFor && recRestaurant && (
        <RestaurantRecommendationsDialog
          open
          onOpenChange={(open) => !open && setRecFor(null)}
          restaurant={recRestaurant}
          reasonText={t(`notifications.${recFor.event}`, { name: recRestaurant.name })}
        />
      )}
    </>
  );
}
