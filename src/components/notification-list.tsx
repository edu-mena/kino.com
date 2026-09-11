import { Link } from "@tanstack/react-router";
import { getRestaurant } from "@/data/helpers";
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
    <ul className="divide-y divide-border">
      {items.map((n) => {
        const name = getRestaurant(n.restaurantId)?.name ?? "";
        const to = targetFor(scope, n.kind);
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
                {t(`notifications.${n.event}`, { name })}
              </span>
            </span>
            <span className="mt-0.5 block pl-3.5 text-[11px] text-muted-foreground">
              {fmt(n.at)}
            </span>
          </>
        );
        return (
          <li key={n.id}>
            {to ? (
              <Link to={to} onClick={onNavigate} className="block px-4 py-2.5 hover:bg-surface">
                {body}
              </Link>
            ) : (
              <div className="px-4 py-2.5">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
