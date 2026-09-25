import { Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { RestaurantRecommendationsDialog } from "@/components/restaurant-recommendations-dialog";
import { declineApiFollowInvite, muteApiFollowInvites } from "@/data/api-profile-views";
import { useRestaurants } from "@/data/use-restaurants-query";
import { useTranslation } from "@/i18n";
import { hasRealBackend } from "@/lib/api-client";
import { getAuthToken } from "@/lib/auth";
import { declineMockInvite, muteMockInvite } from "@/lib/follow-invites";
import { useFollows } from "@/lib/follows";
import { useNotifications, type LukuNotification } from "@/lib/notifications";

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
  const { markRead } = useNotifications();
  const { isFollowing, toggleFollow } = useFollows();
  const navigate = useNavigate();

  // Convite "siga-nos" (ver @/lib/follow-invites): seguir, "agora não"
  // (o restaurante só pode voltar a convidar 90 dias depois) ou silenciar
  // os convites deste restaurante de vez.
  const answerInvite = (n: LukuNotification, answer: "follow" | "decline" | "mute") => {
    markRead(n.id);
    const name = restaurantById.get(n.restaurantId)?.name ?? "";
    if (answer === "follow") {
      if (!isFollowing(n.restaurantId) && toggleFollow(n.restaurantId) === "login") {
        void navigate({ to: "/entrar" });
        return;
      }
      toast(t("follow.followedToast", { name }));
      return;
    }
    if (hasRealBackend) {
      const token = getAuthToken();
      if (!token) return;
      const request =
        answer === "decline"
          ? declineApiFollowInvite(n.restaurantId, token)
          : muteApiFollowInvites(n.restaurantId, token);
      void request.catch(() => {});
    } else if (n.ownerKey) {
      (answer === "decline" ? declineMockInvite : muteMockInvite)(n.restaurantId, n.ownerKey);
    }
    if (answer === "mute") toast(t("notifications.followInviteMutedToast", { name }));
  };
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
          const isInvite = scope === "client" && n.event === "followInvite";
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
              {isInvite && !n.read && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 pb-2.5 pl-[1.625rem] text-xs font-semibold">
                  {!isFollowing(n.restaurantId) && (
                    <button
                      type="button"
                      onClick={() => answerInvite(n, "follow")}
                      className="rounded-lg bg-primary px-3 py-1 text-primary-foreground hover:bg-primary/90"
                    >
                      {t("notifications.followInviteAccept")}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => answerInvite(n, "decline")}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {t("notifications.followInviteDecline")}
                  </button>
                  <button
                    type="button"
                    onClick={() => answerInvite(n, "mute")}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {t("notifications.followInviteMute")}
                  </button>
                </div>
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
