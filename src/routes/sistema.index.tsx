import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, CircleCheck, Inbox, Store, TrendingUp, Users, Wallet } from "lucide-react";
import { useMemo } from "react";
import {
  KpiTile,
  StatBars,
  StatCard,
  StatSection,
  TrendArea,
  TrendBadge,
  type StatBarRow,
} from "@/components/admin-stats";
import { SystemPageHeading } from "@/components/system-shell";
import { getAllRestaurants } from "@/data/helpers";
import { INITIAL_CUSTOMERS } from "@/data/mockData";
import { PLAN_PRICE } from "@/data/subscriptions-store";
import { useTranslation } from "@/i18n";
import { useCart } from "@/lib/cart";
import { formatKz } from "@/lib/format";
import { usePartnerApps } from "@/lib/partner-apps";
import { useReservations } from "@/lib/reservations";
import { useSubscriptions } from "@/lib/subscriptions";
import { BCP47, last8Weeks } from "@/lib/week";

export const Route = createFileRoute("/sistema/")({
  head: () => ({ meta: [{ title: "Visão geral — Sistema Kino.com" }] }),
  component: SistemaIndex,
});

const DAY = 86_400_000;
const pctDelta = (cur: number, prev: number) =>
  prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null;

function SistemaIndex() {
  const { orders, orderTotal } = useCart();
  const { reservations } = useReservations();
  const { subscriptions, mrr, counts } = useSubscriptions();
  const { counts: appCounts } = usePartnerApps();
  const { t, locale } = useTranslation();

  const restaurants = useMemo(() => getAllRestaurants(), []);

  const stats = useMemo(() => {
    const now = Date.now();
    const delivered = orders.filter((o) => o.status === "delivered");
    const deliveredRevenue = delivered.reduce((s, o) => s + orderTotal(o), 0);

    const since30 = now - 30 * DAY;
    const orders30 = orders.filter((o) => new Date(o.createdAt).getTime() >= since30).length;
    const resv30 = reservations.filter(
      (r) => new Date(r.createdAt.replace(" ", "T")).getTime() >= since30,
    ).length;

    // Receita entregue agregada por semana (8 semanas)
    const weeks = last8Weeks().map((start) => {
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      const from = start.getTime();
      const to = end.getTime();
      const rev = delivered
        .filter((o) => {
          const ts = new Date(o.createdAt).getTime();
          return ts >= from && ts < to;
        })
        .reduce((s, o) => s + orderTotal(o), 0);
      return {
        label: start.toLocaleDateString(BCP47[locale], { day: "2-digit", month: "short" }),
        revenue: rev,
      };
    });
    const revenueDelta = pctDelta(weeks[6]?.revenue ?? 0, weeks[5]?.revenue ?? 0);

    // Ranking por receita entregue
    const revByRestaurant = new Map<string, number>();
    for (const o of delivered) {
      revByRestaurant.set(
        o.restaurantId,
        (revByRestaurant.get(o.restaurantId) ?? 0) + orderTotal(o),
      );
    }
    const topRestaurants = [...revByRestaurant.entries()]
      .map(([id, rev]) => ({ restaurant: restaurants.find((r) => r.id === id), rev }))
      .filter(
        (x): x is { restaurant: NonNullable<typeof x.restaurant>; rev: number } => !!x.restaurant,
      )
      .sort((a, b) => b.rev - a.rev)
      .slice(0, 5);

    const planBars: StatBarRow[] = (["basico", "pro"] as const).map((plan, i) => {
      const count = subscriptions.filter((s) => s.plan === plan).length;
      return {
        key: plan,
        label: `${t(`sistema.plan.${plan}`)} · ${formatKz(PLAN_PRICE[plan])}`,
        count,
        pct: subscriptions.length ? Math.round((count / subscriptions.length) * 100) : 0,
        tone: i === 0 ? "bg-primary" : "bg-brand",
      };
    });
    const statusTone: Record<string, string> = {
      trial: "bg-brand",
      active: "bg-success",
      overdue: "bg-destructive",
      suspended: "bg-muted-foreground/50",
    };
    const statusBars: StatBarRow[] = (["trial", "active", "overdue", "suspended"] as const).map(
      (k) => ({
        key: k,
        label: t(`sistema.subStatus.${k}`),
        count: counts[k],
        pct: subscriptions.length ? Math.round((counts[k] / subscriptions.length) * 100) : 0,
        tone: statusTone[k]!,
      }),
    );

    const trialsEndingSoon = subscriptions.filter(
      (s) => s.status === "trial" && Date.parse(s.trialEndsAt) - now <= 7 * DAY,
    ).length;

    return {
      deliveredRevenue,
      deliveredCount: delivered.length,
      orders30,
      resv30,
      weeks,
      revenueDelta,
      topRestaurants,
      planBars,
      statusBars,
      trialsEndingSoon,
    };
  }, [orders, reservations, subscriptions, counts, orderTotal, restaurants, t, locale]);

  const attention = [
    {
      to: "/sistema/subscricoes" as const,
      label: t("sistema.index.attnOverdue"),
      value: counts.overdue,
    },
    {
      to: "/sistema/parceiros" as const,
      label: t("sistema.index.attnApps"),
      value: appCounts.pending,
    },
    {
      to: "/sistema/subscricoes" as const,
      label: t("sistema.index.attnTrials"),
      value: stats.trialsEndingSoon,
    },
  ];
  const allClear = attention.every((a) => a.value === 0);

  return (
    <div className="pb-20">
      <SystemPageHeading
        eyebrow={t("sistema.index.eyebrow")}
        title={t("sistema.index.title")}
        description={t("sistema.index.description")}
      />

      <div className="mx-auto max-w-6xl px-4 md:px-6">
        {/* Precisa de atenção */}
        <section className="mt-8">
          <h2 className="font-display text-lg font-bold text-foreground">
            {t("sistema.index.attnTitle")}
          </h2>
          {allClear ? (
            <div className="card-soft mt-4 flex items-center gap-3 p-5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-success/10 text-success">
                <CircleCheck className="h-5 w-5" />
              </span>
              <p className="text-sm font-semibold text-foreground">{t("sistema.index.allClear")}</p>
            </div>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {attention.map((a) => {
                const active = a.value > 0;
                return (
                  <Link
                    key={a.label}
                    to={a.to}
                    className={`card-soft group flex items-center gap-4 p-5 transition-colors ${
                      active ? "border-brand/40 hover:border-brand" : "hover:border-border"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className={`font-display text-2xl font-extrabold ${
                          active ? "text-brand" : "text-muted-foreground"
                        }`}
                      >
                        {a.value}
                      </p>
                      <p className="truncate text-sm font-medium text-foreground">{a.label}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Receita da plataforma */}
        <StatSection title={t("sistema.index.revenueTitle")} hint={t("sistema.index.revenueHint")}>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <StatCard
              wide
              title={t("sistema.index.aggRevenueTitle")}
              subtitle={t("sistema.index.aggRevenueSub")}
              right={
                <TrendBadge delta={stats.revenueDelta} label={t("sistema.index.vsPrevWeek")} />
              }
            >
              <TrendArea
                points={stats.weeks.map((w) => ({ label: w.label, a: w.revenue }))}
                legendA={t("sistema.index.legendRevenue")}
              />
            </StatCard>
            <div className="grid gap-4">
              <KpiTile
                icon={Wallet}
                tone="success"
                label={t("sistema.index.kpiMrr")}
                value={formatKz(mrr)}
                hint={t("sistema.index.kpiMrrHint", { count: counts.active })}
              />
              <KpiTile
                icon={TrendingUp}
                tone="primary"
                label={t("sistema.index.kpiDelivered")}
                value={formatKz(stats.deliveredRevenue)}
                hint={t("sistema.index.kpiDeliveredHint", { count: stats.deliveredCount })}
              />
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiTile
              icon={Store}
              tone="primary"
              big={false}
              label={t("sistema.index.kpiRestaurants")}
              value={String(restaurants.length)}
              hint={t("sistema.index.kpiRestaurantsHint", {
                active: counts.active + counts.trial,
              })}
            />
            <KpiTile
              icon={TrendingUp}
              tone="brand"
              big={false}
              label={t("sistema.index.kpiOrders30")}
              value={String(stats.orders30)}
              hint={t("sistema.index.kpiOrders30Hint")}
            />
            <KpiTile
              icon={TrendingUp}
              tone="brand"
              big={false}
              label={t("sistema.index.kpiResv30")}
              value={String(stats.resv30)}
              hint={t("sistema.index.kpiResv30Hint")}
            />
            <KpiTile
              icon={Users}
              tone="muted"
              big={false}
              label={t("sistema.index.kpiCustomers")}
              value={INITIAL_CUSTOMERS.length.toLocaleString(BCP47[locale])}
              hint={t("sistema.index.kpiCustomersHint")}
            />
          </div>
        </StatSection>

        {/* Subscrições + ranking */}
        <StatSection title={t("sistema.index.subsTitle")} hint={t("sistema.index.subsHint")}>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <StatCard
              title={t("sistema.index.byPlan")}
              subtitle={t("sistema.index.mrrLine", {
                value: formatKz(mrr),
              })}
            >
              <StatBars rows={stats.planBars} />
            </StatCard>
            <StatCard
              title={t("sistema.index.byStatus")}
              subtitle={t("sistema.index.subsCount", {
                count: subscriptions.length,
              })}
            >
              <StatBars rows={stats.statusBars} />
            </StatCard>
            <StatCard
              title={t("sistema.index.topRestaurants")}
              subtitle={t("sistema.index.topRestaurantsSub")}
            >
              {stats.topRestaurants.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("sistema.index.noData")}</p>
              ) : (
                <div className="space-y-3">
                  {stats.topRestaurants.map((x, i) => (
                    <div key={x.restaurant.id} className="flex items-center gap-3">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface text-xs font-bold text-muted-foreground">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                        {x.restaurant.name}
                      </span>
                      <span className="shrink-0 text-sm font-bold text-primary">
                        {formatKz(x.rev)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </StatCard>
          </div>
        </StatSection>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/sistema/parceiros"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary"
          >
            <Inbox className="h-4 w-4 text-primary" />
            {t("sistema.index.goPartners", { count: appCounts.pending })}
          </Link>
          <Link
            to="/sistema/restaurantes"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary"
          >
            <Store className="h-4 w-4 text-primary" />
            {t("sistema.index.goRestaurants")}
          </Link>
        </div>
      </div>
    </div>
  );
}
