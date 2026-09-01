import { createFileRoute } from "@tanstack/react-router";
import { CalendarCheck, Package, Search } from "lucide-react";
import { useMemo, useState } from "react";
import {
  ADMIN_FILTER_SELECT,
  KpiTile,
  StatBars,
  StatCard,
  StatSection,
  TrendArea,
  type StatBarRow,
} from "@/components/admin-stats";
import { SystemPageHeading } from "@/components/system-shell";
import { getAllRestaurants, getMenuItem } from "@/data/helpers";
import { useTranslation } from "@/i18n";
import { useCart, type CartOrderStatus } from "@/lib/cart";
import { formatKz } from "@/lib/format";
import { useReservations } from "@/lib/reservations";
import { BCP47, last8Weeks } from "@/lib/week";

export const Route = createFileRoute("/sistema/operacao")({
  head: () => ({ meta: [{ title: "Operação — Sistema Kino.com" }] }),
  component: SistemaOperacao,
});

type Tab = "pedidos" | "reservas";

const orderStatusTone: Record<CartOrderStatus, string> = {
  pending: "bg-brand/15 text-brand",
  accepted: "bg-primary/15 text-primary",
  onTheWay: "bg-primary/15 text-primary",
  delivered: "bg-success/15 text-success",
  rejected: "bg-destructive/15 text-destructive",
  canceled: "bg-muted-foreground/15 text-muted-foreground",
};
const orderBarTone: Record<CartOrderStatus, string> = {
  pending: "bg-brand",
  accepted: "bg-primary",
  onTheWay: "bg-primary/60",
  delivered: "bg-success",
  rejected: "bg-destructive",
  canceled: "bg-muted-foreground/50",
};

function SistemaOperacao() {
  const { orders, orderTotal } = useCart();
  const { reservations } = useReservations();
  const { t, locale } = useTranslation();
  const bcp = BCP47[locale];

  const restaurants = useMemo(() => getAllRestaurants(), []);
  const nameOf = (id: string) => restaurants.find((r) => r.id === id)?.name ?? id;

  const [tab, setTab] = useState<Tab>("pedidos");
  const [restFilter, setRestFilter] = useState("todos");
  const [query, setQuery] = useState("");

  const weekBuckets = useMemo(() => last8Weeks(), []);

  const orderStats = useMemo(() => {
    const statuses: CartOrderStatus[] = [
      "pending",
      "accepted",
      "onTheWay",
      "delivered",
      "rejected",
      "canceled",
    ];
    const dist: StatBarRow[] = statuses.map((k) => {
      const count = orders.filter((o) => o.status === k).length;
      return {
        key: k,
        label: t(`sistema.operacao.order.${k}`),
        count,
        pct: orders.length ? Math.round((count / orders.length) * 100) : 0,
        tone: orderBarTone[k],
      };
    });
    const delivered = orders.filter((o) => o.status === "delivered");
    const points = weekBuckets.map((start) => {
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      const from = start.getTime();
      const to = end.getTime();
      const inW = orders.filter((o) => {
        const ts = new Date(o.createdAt).getTime();
        return ts >= from && ts < to;
      });
      return {
        label: start.toLocaleDateString(bcp, { day: "2-digit", month: "short" }),
        a: inW.length,
        b: inW.filter((o) => o.status === "delivered").length,
      };
    });
    return {
      dist,
      points,
      total: orders.length,
      delivered: delivered.length,
      revenue: delivered.reduce((s, o) => s + orderTotal(o), 0),
      completion: orders.length ? Math.round((delivered.length / orders.length) * 100) : 0,
    };
  }, [orders, orderTotal, weekBuckets, bcp, t]);

  const resvStats = useMemo(() => {
    const confirmed = reservations.filter((r) => r.status === "Confirmada").length;
    const rejected = reservations.filter((r) => r.status === "Recusada").length;
    const pending = reservations.filter((r) => r.status === "Pendente").length;
    const dist: StatBarRow[] = [
      {
        key: "p",
        label: t("sistema.operacao.resv.pending"),
        count: pending,
        tone: "bg-brand",
        pct: 0,
      },
      {
        key: "c",
        label: t("sistema.operacao.resv.confirmed"),
        count: confirmed,
        tone: "bg-success",
        pct: 0,
      },
      {
        key: "r",
        label: t("sistema.operacao.resv.rejected"),
        count: rejected,
        tone: "bg-destructive",
        pct: 0,
      },
    ].map((row) => ({
      ...row,
      pct: reservations.length ? Math.round((row.count / reservations.length) * 100) : 0,
    }));
    const points = weekBuckets.map((start) => {
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      const from = start.getTime();
      const to = end.getTime();
      const inW = reservations.filter((r) => {
        const ts = new Date(r.createdAt.replace(" ", "T")).getTime();
        return ts >= from && ts < to;
      });
      return {
        label: start.toLocaleDateString(bcp, { day: "2-digit", month: "short" }),
        a: inW.length,
        b: inW.filter((r) => r.status === "Confirmada").length,
      };
    });
    return { dist, points, total: reservations.length, confirmed, pending };
  }, [reservations, weekBuckets, bcp, t]);

  const orderRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders
      .filter((o) => {
        if (restFilter !== "todos" && o.restaurantId !== restFilter) return false;
        if (q) {
          const hay =
            `${nameOf(o.restaurantId)} ${o.customerName} ${o.deliveryAddress.line1} ${o.lines
              .map((l) => getMenuItem(l.menuItemId)?.name ?? "")
              .join(" ")}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, restFilter, query, restaurants]);

  const resvRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reservations
      .filter((r) => {
        if (restFilter !== "todos" && r.restaurantId !== restFilter) return false;
        if (q && !`${nameOf(r.restaurantId)} ${r.customerName}`.toLowerCase().includes(q))
          return false;
        return true;
      })
      .sort(
        (a, b) =>
          Date.parse(b.createdAt.replace(" ", "T")) - Date.parse(a.createdAt.replace(" ", "T")),
      )
      .slice(0, 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservations, restFilter, query, restaurants]);

  const fmtDate = (iso: string) =>
    new Date(iso.replace(" ", "T")).toLocaleString(bcp, {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="pb-16">
      <SystemPageHeading
        eyebrow={t("sistema.operacao.eyebrow")}
        title={t("sistema.operacao.title")}
        description={t("sistema.operacao.description")}
        action={
          <div className="inline-flex rounded-lg border border-border bg-card p-0.5 text-xs font-semibold">
            {(["pedidos", "reservas"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className={`rounded-md px-3 py-1 transition-colors ${
                  tab === k
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t(`sistema.operacao.tab.${k}`)}
              </button>
            ))}
          </div>
        }
      />

      <div className="mx-auto max-w-6xl px-4 md:px-6">
        {tab === "pedidos" ? (
          <StatSection
            title={t("sistema.operacao.ordersTitle")}
            hint={t("sistema.operacao.ordersHint")}
          >
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiTile
                icon={Package}
                tone="primary"
                big={false}
                label={t("sistema.operacao.kpiTotal")}
                value={String(orderStats.total)}
                hint={t("sistema.operacao.kpiTotalHint")}
              />
              <KpiTile
                icon={Package}
                tone="success"
                big={false}
                label={t("sistema.operacao.kpiDelivered")}
                value={String(orderStats.delivered)}
                hint={t("sistema.operacao.kpiCompletion", { pct: orderStats.completion })}
              />
              <KpiTile
                icon={Package}
                tone="success"
                big={false}
                label={t("sistema.operacao.kpiRevenue")}
                value={formatKz(orderStats.revenue)}
                hint={t("sistema.operacao.kpiRevenueHint")}
              />
              <KpiTile
                icon={Package}
                tone="brand"
                big={false}
                label={t("sistema.operacao.kpiPending")}
                value={String(orderStats.dist[0]?.count ?? 0)}
                hint={t("sistema.operacao.kpiPendingHint")}
              />
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <StatCard
                wide
                title={t("sistema.operacao.trendTitle")}
                subtitle={t("sistema.operacao.trendSub")}
              >
                <TrendArea
                  points={orderStats.points}
                  legendA={t("sistema.operacao.legendReceived")}
                  legendB={t("sistema.operacao.legendDelivered")}
                />
              </StatCard>
              <StatCard
                title={t("sistema.operacao.byStatus")}
                subtitle={t("sistema.operacao.count", { count: orderStats.total })}
              >
                <StatBars rows={orderStats.dist} />
              </StatCard>
            </div>
            {renderFilters()}
            <div className="card-soft mt-3 divide-y divide-border overflow-hidden">
              {orderRows.map((o) => (
                <div
                  key={o.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-sm"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-foreground">
                      {nameOf(o.restaurantId)}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {o.customerName} · {fmtDate(o.createdAt)}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">
                      {formatKz(orderTotal(o))}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${orderStatusTone[o.status]}`}
                    >
                      {t(`sistema.operacao.order.${o.status}`)}
                    </span>
                  </span>
                </div>
              ))}
              {orderRows.length === 0 && (
                <p className="p-8 text-center text-sm text-muted-foreground">
                  {t("sistema.operacao.empty")}
                </p>
              )}
            </div>
          </StatSection>
        ) : (
          <StatSection
            title={t("sistema.operacao.resvTitle")}
            hint={t("sistema.operacao.resvHint")}
          >
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <KpiTile
                icon={CalendarCheck}
                tone="primary"
                big={false}
                label={t("sistema.operacao.kpiResvTotal")}
                value={String(resvStats.total)}
                hint={t("sistema.operacao.kpiResvTotalHint")}
              />
              <KpiTile
                icon={CalendarCheck}
                tone="success"
                big={false}
                label={t("sistema.operacao.resv.confirmed")}
                value={String(resvStats.confirmed)}
                hint={t("sistema.operacao.kpiResvConfirmedHint")}
              />
              <KpiTile
                icon={CalendarCheck}
                tone="brand"
                big={false}
                label={t("sistema.operacao.resv.pending")}
                value={String(resvStats.pending)}
                hint={t("sistema.operacao.kpiResvPendingHint")}
              />
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <StatCard
                wide
                title={t("sistema.operacao.resvTrendTitle")}
                subtitle={t("sistema.operacao.trendSub")}
              >
                <TrendArea
                  points={resvStats.points}
                  legendA={t("sistema.operacao.legendRequested")}
                  legendB={t("sistema.operacao.resv.confirmed")}
                />
              </StatCard>
              <StatCard
                title={t("sistema.operacao.byStatus")}
                subtitle={t("sistema.operacao.count", { count: resvStats.total })}
              >
                <StatBars rows={resvStats.dist} />
              </StatCard>
            </div>
            {renderFilters()}
            <div className="card-soft mt-3 divide-y divide-border overflow-hidden">
              {resvRows.map((r) => (
                <div
                  key={r.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-sm"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-foreground">
                      {nameOf(r.restaurantId)}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {r.customerName} · {r.date} {r.time} · {r.peopleCount}{" "}
                      {t("sistema.operacao.people")}
                    </span>
                  </span>
                  <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                    {r.status}
                  </span>
                </div>
              ))}
              {resvRows.length === 0 && (
                <p className="p-8 text-center text-sm text-muted-foreground">
                  {t("sistema.operacao.empty")}
                </p>
              )}
            </div>
          </StatSection>
        )}
      </div>
    </div>
  );

  function renderFilters() {
    return (
      <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 transition-colors focus-within:border-brand sm:max-w-xs">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("sistema.operacao.searchPlaceholder")}
            className="w-full min-w-0 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
        <select
          value={restFilter}
          onChange={(e) => setRestFilter(e.target.value)}
          className={ADMIN_FILTER_SELECT}
        >
          <option value="todos">{t("sistema.operacao.allRestaurants")}</option>
          {restaurants
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name, "pt"))
            .map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
        </select>
      </div>
    );
  }
}
