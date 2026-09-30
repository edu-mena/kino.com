import { createFileRoute } from "@tanstack/react-router";
import { Bell, Check } from "lucide-react";
import { useMemo, useState } from "react";
import icon from "@/assets/icon.png";
import { EmptyState } from "@/components/empty-state";
import { ClientListFilters, FilteredEmpty } from "@/components/list-recency";
import { NotificationList } from "@/components/notification-list";
import { PageHeading, PageShell } from "@/components/site-shell";
import { useRestaurants } from "@/data/use-restaurants-query";
import { useAuth } from "@/lib/auth";
import { viewerKey } from "@/lib/customer";
import {
  EMPTY_CLIENT_LIST_FILTER,
  matchesClientListFilter,
  type ClientListFilter,
} from "@/lib/list-filter";
import { scopeNotifications, useNotifications } from "@/lib/notifications";
import { parseIsoDate } from "@/lib/recency-groups";
import { useTranslation } from "@/i18n";

export const Route = createFileRoute("/notificacoes")({
  head: () => ({
    meta: [
      { title: "Notificações — Luku.com" },
      {
        name: "description",
        content: "Todo o histórico de notificações dos seus pedidos e reservas.",
      },
      { property: "og:title", content: "Notificações — Luku.com" },
      { property: "og:image", content: icon },
    ],
  }),
  component: Notificacoes,
});

/** Histórico completo — o sino só mostra as não lidas; aqui ficam todas,
 * lidas ou não, para sempre poder consultar o que já aconteceu. */
function Notificacoes() {
  const { all, markManyRead } = useNotifications();
  const { user } = useAuth();
  const { t } = useTranslation();

  const list = useMemo(() => {
    const mineKey = viewerKey(user);
    return scopeNotifications(all, "client", { ownerKey: mineKey });
  }, [all, user]);

  const unreadIds = useMemo(() => list.filter((n) => !n.read).map((n) => n.id), [list]);

  const { data: restaurants = [] } = useRestaurants();
  const [filter, setFilter] = useState<ClientListFilter>(EMPTY_CLIENT_LIST_FILTER);
  const filterRestaurants = useMemo(() => {
    const nameById = new Map(restaurants.map((r) => [r.id, r.name]));
    const ids = [...new Set(list.map((n) => n.restaurantId).filter(Boolean))];
    return ids
      .map((id) => ({ id, name: nameById.get(id) ?? "" }))
      .filter((r) => r.name)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [list, restaurants]);
  const filtered = useMemo(
    () => list.filter((n) => matchesClientListFilter(filter, n.restaurantId, parseIsoDate(n.at))),
    [list, filter],
  );

  return (
    <PageShell>
      <PageHeading
        eyebrow={t("notifications.aria")}
        title={t("notifications.title")}
        description={t("notifications.historyDescription")}
      />
      <div className="mx-auto mt-8 max-w-2xl px-4 md:px-6">
        {list.length > 0 && unreadIds.length > 0 && (
          <div className="mb-3 flex justify-end">
            <button
              type="button"
              onClick={() => markManyRead(unreadIds)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary"
            >
              <Check className="h-3.5 w-3.5" />
              {t("notifications.markAllRead")}
            </button>
          </div>
        )}
        {list.length === 0 ? (
          <EmptyState icon={Bell} description={t("notifications.empty")} />
        ) : (
          <div className="space-y-4">
            <ClientListFilters
              restaurants={filterRestaurants}
              value={filter}
              onChange={setFilter}
            />
            {filtered.length === 0 ? (
              <FilteredEmpty onClear={() => setFilter(EMPTY_CLIENT_LIST_FILTER)} />
            ) : (
              <div className="card-soft overflow-hidden">
                <NotificationList
                  items={filtered}
                  scope="client"
                  emptyText={t("notifications.empty")}
                  groupByDate
                />
              </div>
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}
