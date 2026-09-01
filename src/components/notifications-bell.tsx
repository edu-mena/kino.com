import { Link } from "@tanstack/react-router";
import { Bell, Check } from "lucide-react";
import { useMemo, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getRestaurant } from "@/data/helpers";
import { useTranslation } from "@/i18n";
import { useNotifications } from "@/lib/notifications";
import { useRestaurantAdmin } from "@/lib/restaurant-admin";

/**
 * Sino de notificações. `scope="client"` mostra todas (é o navegador do
 * cliente); `scope="restaurant"` filtra pelo restaurante com sessão no painel.
 */
export function NotificationsBell({ scope }: { scope: "client" | "restaurant" }) {
  const { all, markAllRead } = useNotifications();
  const { t } = useTranslation();
  const { restaurant } = useRestaurantAdmin();
  const [open, setOpen] = useState(false);

  const list = useMemo(() => {
    const rows =
      scope === "restaurant" && restaurant
        ? all.filter((n) => n.restaurantId === restaurant.id)
        : all;
    return rows.slice(0, 12);
  }, [all, scope, restaurant]);

  const unread = list.filter((n) => !n.read).length;

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  const targetFor = (kind: string) =>
    scope === "client" ? (kind === "order" ? "/entrega" : "/reservas") : null;

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o && unread > 0) markAllRead();
      }}
    >
      <DropdownMenuTrigger
        aria-label={t("notifications.aria")}
        className="relative grid h-10 w-10 place-items-center rounded-xl border border-border bg-card text-foreground transition-colors hover:border-primary"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-brand-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <p className="text-sm font-bold text-foreground">{t("notifications.title")}</p>
          {list.length > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary"
            >
              <Check className="h-3.5 w-3.5" />
              {t("notifications.markAllRead")}
            </button>
          )}
        </div>
        {list.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            {t("notifications.empty")}
          </p>
        ) : (
          <ul className="max-h-96 overflow-y-auto py-1">
            {list.map((n) => {
              const name = getRestaurant(n.restaurantId)?.name ?? "";
              const to = targetFor(n.kind);
              const body = (
                <>
                  <span
                    className={`block text-sm ${n.read ? "text-muted-foreground" : "text-foreground"}`}
                  >
                    {t(`notifications.${n.event}`, { name })}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {fmt(n.at)}
                  </span>
                </>
              );
              return (
                <li key={n.id}>
                  {to ? (
                    <Link
                      to={to}
                      onClick={() => setOpen(false)}
                      className="block px-4 py-2.5 hover:bg-surface"
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className="px-4 py-2.5">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
