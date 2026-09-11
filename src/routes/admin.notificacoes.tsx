import { createFileRoute } from "@tanstack/react-router";
import { Bell, Check } from "lucide-react";
import { useMemo } from "react";
import { AdminPageHeading } from "@/components/admin-shell";
import { EmptyState } from "@/components/empty-state";
import { NotificationList } from "@/components/notification-list";
import { scopeNotifications, useNotifications } from "@/lib/notifications";
import { useRestaurantAdmin } from "@/lib/restaurant-admin";
import { useTranslation } from "@/i18n";

export const Route = createFileRoute("/admin/notificacoes")({
  head: () => ({ meta: [{ title: "Notificações — Painel Luku.com" }] }),
  component: AdminNotificacoes,
});

/** Histórico completo do restaurante — o sino só mostra as não lidas; aqui
 * ficam todas, lidas ou não. */
function AdminNotificacoes() {
  const { restaurant } = useRestaurantAdmin();
  const { all, markManyRead } = useNotifications();
  const { t } = useTranslation();

  const list = useMemo(
    () =>
      restaurant ? scopeNotifications(all, "restaurant", { restaurantId: restaurant.id }) : [],
    [all, restaurant],
  );
  const unreadIds = useMemo(() => list.filter((n) => !n.read).map((n) => n.id), [list]);

  if (!restaurant) return null;

  return (
    <div className="pb-16">
      <AdminPageHeading
        eyebrow={t("notifications.aria")}
        title={t("notifications.title")}
        description={t("notifications.historyDescription")}
        action={
          unreadIds.length > 0 ? (
            <button
              type="button"
              onClick={() => markManyRead(unreadIds)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <Check className="h-4 w-4" />
              {t("notifications.markAllRead")}
            </button>
          ) : undefined
        }
      />

      <div className="mx-auto mt-8 max-w-2xl px-4 md:px-6">
        {list.length === 0 ? (
          <EmptyState icon={Bell} description={t("notifications.empty")} />
        ) : (
          <div className="card-soft overflow-hidden">
            <NotificationList
              items={list}
              scope="restaurant"
              emptyText={t("notifications.empty")}
            />
          </div>
        )}
      </div>
    </div>
  );
}
