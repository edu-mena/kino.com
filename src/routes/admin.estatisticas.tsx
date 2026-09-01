import { createFileRoute } from "@tanstack/react-router";
import {
  CalendarCheck,
  Clock3,
  CreditCard,
  Repeat,
  ShieldCheck,
  Star,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  KpiTile,
  MiniBars,
  MiniProgress,
  StatBars,
  StatCard,
  StatSection,
  TrendArea,
  TrendBadge,
  type StatBarRow,
} from "@/components/admin-stats";
import { AdminPageHeading } from "@/components/admin-shell";
import { getMenuItem, getReviewsForRestaurant } from "@/data/helpers";
import { useTranslation } from "@/i18n";
import { lineUnitPrice, useCart, type CartOrder } from "@/lib/cart";
import { customerKey } from "@/lib/customer";
import { formatKz } from "@/lib/format";
import { useReservations } from "@/lib/reservations";
import { useRestaurantAdmin } from "@/lib/restaurant-admin";
import { BCP47, last8Weeks } from "@/lib/week";

export const Route = createFileRoute("/admin/estatisticas")({
  head: () => ({ meta: [{ title: "Estatísticas — Painel Kino.com" }] }),
  component: AdminEstatisticas,
});

type Period = "30" | "90" | "all";
const PERIODS: Period[] = ["30", "90", "all"];
const DAY = 86_400_000;

const pct = (v: number, total: number) => (total > 0 ? Math.round((v / total) * 100) : 0);
const pctDelta = (cur: number, prev: number) =>
  prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null;
const orderCustomerKey = (o: CartOrder) =>
  customerKey({ email: o.customerEmail, phone: o.customerPhone, name: o.customerName });

const BAR_TONES = [
  "bg-primary",
  "bg-brand",
  "bg-success",
  "bg-primary/60",
  "bg-brand/60",
  "bg-success/60",
];

function AdminEstatisticas() {
  const { restaurant } = useRestaurantAdmin();
  const { orders, orderTotal, orderSubtotal } = useCart();
  const { reservations } = useReservations();
  const { t, locale } = useTranslation();
  const [period, setPeriod] = useState<Period>("90");

  const bcp = BCP47[locale];

  const mineOrders = useMemo(
    () => (restaurant ? orders.filter((o) => o.restaurantId === restaurant.id) : []),
    [orders, restaurant],
  );
  const mineResv = useMemo(
    () => (restaurant ? reservations.filter((r) => r.restaurantId === restaurant.id) : []),
    [reservations, restaurant],
  );

  const resvTime = (iso: string) => new Date(iso.replace(" ", "T")).getTime();

  // --- Tendência fixa: últimas 8 semanas (não segue o seletor de período) ---
  const weeks = useMemo(() => {
    const starts = last8Weeks();
    return starts.map((start) => {
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      const from = start.getTime();
      const to = end.getTime();
      const os = mineOrders.filter((o) => {
        const ts = new Date(o.createdAt).getTime();
        return ts >= from && ts < to;
      });
      const del = os.filter((o) => o.status === "delivered");
      const rs = mineResv.filter((r) => {
        const ts = resvTime(r.createdAt);
        return ts >= from && ts < to;
      });
      return {
        label: start.toLocaleDateString(bcp, { day: "2-digit", month: "short" }),
        orders: os.length,
        delivered: del.length,
        revenue: del.reduce((s, o) => s + orderTotal(o), 0),
        resv: rs.length,
        confirmed: rs.filter((r) => r.status === "Confirmada").length,
      };
    });
  }, [mineOrders, mineResv, bcp, orderTotal]);

  const revenueDelta = pctDelta(weeks[6]?.revenue ?? 0, weeks[5]?.revenue ?? 0);
  const ordersDelta = pctDelta(weeks[6]?.orders ?? 0, weeks[5]?.orders ?? 0);

  // --- Agregados do período selecionado ---
  const stats = useMemo(() => {
    const cutoff = period === "all" ? 0 : Date.now() - Number(period) * DAY;
    const pOrders = mineOrders.filter((o) => new Date(o.createdAt).getTime() >= cutoff);
    const pResv = mineResv.filter((r) => resvTime(r.createdAt) >= cutoff);

    const delivered = pOrders.filter((o) => o.status === "delivered");
    const rejected = pOrders.filter((o) => o.status === "rejected");
    const nonRejected = pOrders.filter((o) => o.status !== "rejected");

    const goodsRevenue = delivered.reduce((s, o) => s + orderSubtotal(o), 0);
    const deliveredRevenue = delivered.reduce((s, o) => s + orderTotal(o), 0);
    const deliveryRevenue = deliveredRevenue - goodsRevenue;

    const confirmed = pResv.filter((r) => r.status === "Confirmada");
    const responded = pResv.filter((r) => r.status !== "Pendente");
    const depositHeld = confirmed.reduce((s, r) => s + (r.cautionAmount ?? 0), 0);
    const acceptanceRate = responded.length ? pct(confirmed.length, responded.length) : null;
    const peopleServed = confirmed.reduce((s, r) => s + r.peopleCount, 0);

    const grossRevenue = deliveredRevenue + depositHeld;
    const avgTicket = delivered.length ? Math.round(deliveredRevenue / delivered.length) : 0;

    // Estados
    const statusKeys = [
      "pending",
      "accepted",
      "onTheWay",
      "delivered",
      "rejected",
      "canceled",
    ] as const;
    const statusTones: Record<string, string> = {
      pending: "bg-brand",
      accepted: "bg-primary",
      onTheWay: "bg-primary/60",
      delivered: "bg-success",
      rejected: "bg-destructive",
      canceled: "bg-muted-foreground/50",
    };
    const statusDist: StatBarRow[] = statusKeys.map((k) => {
      const count = pOrders.filter((o) => o.status === k).length;
      return {
        key: k,
        label: t(`adminEstatisticas.status.${k}`),
        count,
        pct: pct(count, pOrders.length),
        tone: statusTones[k]!,
      };
    });

    // Pagamentos (pedidos entregues)
    const payBuckets = { express: 0, cash: 0, other: 0, none: 0 };
    for (const o of delivered) {
      const m = (o.paymentMethod ?? "").toLowerCase();
      if (!m) payBuckets.none += 1;
      else if (m.includes("express") || m.includes("multicaixa")) payBuckets.express += 1;
      else if (m.includes("numerário") || m.includes("numerario") || m.includes("cash"))
        payBuckets.cash += 1;
      else payBuckets.other += 1;
    }
    const payTones: Record<string, string> = {
      express: "bg-primary",
      cash: "bg-success",
      other: "bg-brand",
      none: "bg-muted-foreground/50",
    };
    const payments: StatBarRow[] = (["express", "cash", "other", "none"] as const)
      .map((k) => ({
        key: k,
        label: t(`adminEstatisticas.pay.${k}`),
        count: payBuckets[k],
        pct: pct(payBuckets[k], delivered.length),
        tone: payTones[k]!,
      }))
      .filter((r) => r.count > 0);

    // Horários de pico
    const hourKeys = ["morning", "lunch", "afternoon", "dinner", "night"] as const;
    const hourOf = (h: number) =>
      h < 6
        ? "night"
        : h < 11
          ? "morning"
          : h < 15
            ? "lunch"
            : h < 18
              ? "afternoon"
              : h < 22
                ? "dinner"
                : "night";
    const hourCounts: Record<string, number> = Object.fromEntries(hourKeys.map((k) => [k, 0]));
    for (const o of nonRejected) hourCounts[hourOf(new Date(o.createdAt).getHours())]! += 1;
    const peakHours = hourKeys.map((k) => ({
      label: t(`adminEstatisticas.hour.${k}`),
      value: hourCounts[k]!,
    }));

    // Ocupação por dia da semana (reservas confirmadas)
    const dowKeys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
    const dowCounts: Record<string, number> = Object.fromEntries(dowKeys.map((k) => [k, 0]));
    for (const r of confirmed) {
      const js = new Date(r.date).getDay(); // 0=Dom
      dowCounts[dowKeys[(js + 6) % 7]!]! += 1;
    }
    const weekdayOcc = dowKeys.map((k) => ({
      label: t(`adminEstatisticas.dow.${k}`),
      value: dowCounts[k]!,
    }));

    // Dimensão dos grupos
    const groupDefs: { key: string; test: (n: number) => boolean }[] = [
      { key: "g12", test: (n) => n <= 2 },
      { key: "g34", test: (n) => n >= 3 && n <= 4 },
      { key: "g56", test: (n) => n >= 5 && n <= 6 },
      { key: "g7", test: (n) => n >= 7 },
    ];
    const groupSize: StatBarRow[] = groupDefs.map((g, i) => {
      const count = confirmed.filter((r) => g.test(r.peopleCount)).length;
      return {
        key: g.key,
        label: t(`adminEstatisticas.group.${g.key}`),
        count,
        pct: pct(count, confirmed.length),
        tone: BAR_TONES[i]!,
      };
    });

    // Menu — top pratos por receita + receita por categoria
    const dishAgg = new Map<string, { qty: number; revenue: number }>();
    const catAgg = new Map<string, number>();
    for (const o of nonRejected) {
      for (const line of o.lines) {
        const rev = lineUnitPrice(line) * line.qty;
        const cur = dishAgg.get(line.menuItemId) ?? { qty: 0, revenue: 0 };
        dishAgg.set(line.menuItemId, { qty: cur.qty + line.qty, revenue: cur.revenue + rev });
        const cat = getMenuItem(line.menuItemId)?.category ?? "—";
        catAgg.set(cat, (catAgg.get(cat) ?? 0) + rev);
      }
    }
    const goodsAll = [...dishAgg.values()].reduce((s, d) => s + d.revenue, 0);
    const topDishes = [...dishAgg.entries()]
      .map(([id, d]) => ({ item: getMenuItem(id), ...d }))
      .filter(
        (d): d is { item: NonNullable<typeof d.item>; qty: number; revenue: number } => !!d.item,
      )
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
    const categoryRevenue: StatBarRow[] = [...catAgg.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([cat, rev], i) => ({
        key: cat,
        label: cat,
        count: rev,
        pct: pct(rev, goodsAll),
        tone: BAR_TONES[i % BAR_TONES.length]!,
      }));

    // Clientes
    const byCustomer = new Map<string, { name: string; orders: number; spent: number }>();
    for (const o of nonRejected) {
      const k = orderCustomerKey(o);
      const cur = byCustomer.get(k) ?? {
        name: o.customerName || t("adminEstatisticas.customers.anon"),
        orders: 0,
        spent: 0,
      };
      byCustomer.set(k, {
        name: cur.name,
        orders: cur.orders + 1,
        spent: cur.spent + orderTotal(o),
      });
    }
    const customers = [...byCustomer.values()];
    const returning = customers.filter((c) => c.orders >= 2).length;
    const totalSpent = customers.reduce((s, c) => s + c.spent, 0);
    const newReturning: StatBarRow[] = [
      {
        key: "returning",
        label: t("adminEstatisticas.customers.segReturning"),
        count: returning,
        pct: pct(returning, customers.length),
        tone: "bg-primary",
      },
      {
        key: "oneTime",
        label: t("adminEstatisticas.customers.segOneTime"),
        count: customers.length - returning,
        pct: pct(customers.length - returning, customers.length),
        tone: "bg-brand",
      },
    ];
    const topSpenders = [...customers].sort((a, b) => b.spent - a.spent).slice(0, 5);

    return {
      pOrdersCount: pOrders.length,
      deliveredCount: delivered.length,
      rejectedCount: rejected.length,
      grossRevenue,
      deliveredRevenue,
      goodsRevenue,
      deliveryRevenue,
      depositHeld,
      avgTicket,
      confirmedCount: confirmed.length,
      acceptanceRate,
      peopleServed,
      statusDist,
      payments,
      peakHours,
      weekdayOcc,
      groupSize,
      topDishes,
      goodsAll,
      categoryRevenue,
      uniqueCustomers: customers.length,
      returning,
      returnRate: pct(returning, customers.length),
      spendPerCustomer: customers.length ? Math.round(totalSpent / customers.length) : 0,
      newReturning,
      topSpenders,
    };
  }, [mineOrders, mineResv, period, orderTotal, orderSubtotal, t]);

  const reviews = useMemo(
    () => (restaurant ? getReviewsForRestaurant(restaurant.id) : []),
    [restaurant],
  );
  const ratingRows = useMemo<StatBarRow[]>(() => {
    return [5, 4, 3, 2, 1].map((stars) => {
      const count = reviews.filter((r) => r.rating === stars).length;
      return {
        key: String(stars),
        label: `${stars} ★`,
        count,
        pct: pct(count, reviews.length),
        tone: stars >= 4 ? "bg-success" : stars === 3 ? "bg-brand" : "bg-destructive",
      };
    });
  }, [reviews]);
  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : (restaurant?.rating ?? 0);
  const topTags = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of reviews) for (const tag of r.tags) m.set(tag, (m.get(tag) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [reviews]);

  if (!restaurant) return null;

  const composition = [
    {
      key: "goods",
      label: t("adminEstatisticas.revenue.compGoods"),
      value: stats.goodsRevenue,
      tone: "bg-primary",
    },
    {
      key: "delivery",
      label: t("adminEstatisticas.revenue.compDelivery"),
      value: stats.deliveryRevenue,
      tone: "bg-brand",
    },
    {
      key: "deposits",
      label: t("adminEstatisticas.revenue.compDeposits"),
      value: stats.depositHeld,
      tone: "bg-success",
    },
  ];

  return (
    <div className="pb-20">
      <AdminPageHeading
        eyebrow={t("adminEstatisticas.eyebrow")}
        title={t("adminEstatisticas.title")}
        description={t("adminEstatisticas.description")}
        action={
          <div className="inline-flex rounded-lg border border-border bg-card p-0.5 text-xs font-semibold">
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`rounded-md px-3 py-1 transition-colors ${
                  period === p
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t(`adminEstatisticas.period.${p === "all" ? "all" : `d${p}`}`)}
              </button>
            ))}
          </div>
        }
      />

      <div className="mx-auto max-w-6xl px-4 md:px-6">
        {/* ---------- Receita geral ---------- */}
        <StatSection
          title={t("adminEstatisticas.revenue.section")}
          hint={t("adminEstatisticas.revenue.sectionHint")}
        >
          <div className="mt-4 card-soft p-5 sm:p-6">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("adminEstatisticas.revenue.gross")}
                </p>
                <div className="mt-1 flex flex-wrap items-end gap-3">
                  <p className="font-display text-4xl font-extrabold text-primary">
                    {formatKz(stats.grossRevenue)}
                  </p>
                  <TrendBadge
                    delta={revenueDelta}
                    label={t("adminEstatisticas.revenue.vsPrevWeek")}
                  />
                </div>

                <dl className="mt-5 space-y-3">
                  {composition.map((c) => (
                    <div key={c.key}>
                      <div className="flex items-baseline justify-between text-sm">
                        <dt className="flex items-center gap-2 font-medium text-foreground">
                          <span className={`h-2 w-2 rounded-full ${c.tone}`} />
                          {c.label}
                        </dt>
                        <dd className="tabular-nums text-muted-foreground">
                          <span className="font-bold text-foreground">{formatKz(c.value)}</span> ·{" "}
                          {pct(c.value, stats.grossRevenue)}%
                        </dd>
                      </div>
                      <div className="mt-1.5">
                        <MiniProgress pct={pct(c.value, stats.grossRevenue)} tone={c.tone} />
                      </div>
                    </div>
                  ))}
                </dl>

                <p className="mt-5 text-xs text-muted-foreground">
                  {t("adminEstatisticas.revenue.avgTicket", { value: formatKz(stats.avgTicket) })}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("adminEstatisticas.revenue.byWeek")}
                </p>
                <div className="mt-3">
                  <TrendArea
                    points={weeks.map((w) => ({ label: w.label, a: w.revenue }))}
                    legendA={t("adminEstatisticas.revenue.legend")}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiTile
              icon={Wallet}
              tone="success"
              label={t("adminEstatisticas.kpi.revenue")}
              value={formatKz(stats.deliveredRevenue)}
              hint={t("adminEstatisticas.kpi.revenueHint", { count: stats.deliveredCount })}
            />
            <KpiTile
              icon={TrendingUp}
              tone="primary"
              label={t("adminEstatisticas.kpi.orders")}
              value={String(stats.pOrdersCount)}
              hint={t("adminEstatisticas.kpi.ordersHint", {
                delivered: stats.deliveredCount,
                rejected: stats.rejectedCount,
              })}
            >
              <TrendBadge delta={ordersDelta} label={t("adminEstatisticas.revenue.vsPrevWeek")} />
            </KpiTile>
            <KpiTile
              icon={CalendarCheck}
              tone="brand"
              label={t("adminEstatisticas.kpi.reservations")}
              value={String(stats.confirmedCount)}
              hint={
                stats.acceptanceRate !== null
                  ? t("adminEstatisticas.kpi.reservationsHint", { rate: stats.acceptanceRate })
                  : t("adminEstatisticas.kpi.reservationsNoData")
              }
            >
              {stats.acceptanceRate !== null && <MiniProgress pct={stats.acceptanceRate} />}
            </KpiTile>
            <KpiTile
              icon={Star}
              tone="muted"
              label={t("adminEstatisticas.kpi.rating")}
              value={avgRating.toFixed(1)}
              hint={t("adminEstatisticas.kpi.ratingHint", { count: reviews.length })}
            />
          </div>
        </StatSection>

        {/* ---------- Operação de pedidos ---------- */}
        <StatSection
          title={t("adminEstatisticas.orders.section")}
          hint={t("adminEstatisticas.orders.sectionHint")}
        >
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <StatCard
              wide
              title={t("adminEstatisticas.orders.trend")}
              subtitle={t("adminEstatisticas.orders.trendSub")}
            >
              <TrendArea
                points={weeks.map((w) => ({ label: w.label, a: w.orders, b: w.delivered }))}
                legendA={t("adminEstatisticas.orders.legendTotal")}
                legendB={t("adminEstatisticas.orders.legendDelivered")}
              />
            </StatCard>
            <StatCard
              title={t("adminEstatisticas.orders.statusDist")}
              subtitle={t("adminEstatisticas.orders.unitCount", { count: stats.pOrdersCount })}
            >
              <StatBars rows={stats.statusDist} />
            </StatCard>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <StatCard
              title={t("adminEstatisticas.orders.payments")}
              subtitle={t("adminEstatisticas.orders.paymentsSub")}
            >
              {stats.payments.length ? (
                <StatBars rows={stats.payments} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("adminEstatisticas.emptyGeneric")}
                </p>
              )}
            </StatCard>
            <StatCard
              title={t("adminEstatisticas.orders.peakHours")}
              subtitle={t("adminEstatisticas.orders.peakHoursSub")}
            >
              <MiniBars bars={stats.peakHours} unit={t("adminEstatisticas.orders.unit")} />
            </StatCard>
          </div>
        </StatSection>

        {/* ---------- Reservas ---------- */}
        <StatSection
          title={t("adminEstatisticas.reservations.section")}
          hint={t("adminEstatisticas.reservations.sectionHint")}
        >
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <StatCard
              wide
              title={t("adminEstatisticas.reservations.trend")}
              subtitle={t("adminEstatisticas.orders.trendSub")}
            >
              <TrendArea
                points={weeks.map((w) => ({ label: w.label, a: w.resv, b: w.confirmed }))}
                legendA={t("adminEstatisticas.reservations.legendRequested")}
                legendB={t("adminEstatisticas.reservations.legendConfirmed")}
              />
            </StatCard>
            <KpiTile
              icon={ShieldCheck}
              tone="success"
              label={t("adminEstatisticas.kpi.deposit")}
              value={formatKz(stats.depositHeld)}
              hint={t("adminEstatisticas.kpi.depositHint", { count: stats.confirmedCount })}
            >
              <p className="text-xs text-muted-foreground">
                {t("adminEstatisticas.kpi.peopleServed", { count: stats.peopleServed })}
              </p>
            </KpiTile>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <StatCard
              title={t("adminEstatisticas.reservations.weekday")}
              subtitle={t("adminEstatisticas.reservations.weekdaySub")}
            >
              <MiniBars
                bars={stats.weekdayOcc}
                unit={t("adminEstatisticas.reservations.peopleUnit")}
                tone="bg-brand/80"
              />
            </StatCard>
            <StatCard
              title={t("adminEstatisticas.reservations.groupSize")}
              subtitle={t("adminEstatisticas.reservations.groupSizeSub")}
            >
              {stats.confirmedCount ? (
                <StatBars rows={stats.groupSize} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("adminEstatisticas.emptyGeneric")}
                </p>
              )}
            </StatCard>
          </div>
        </StatSection>

        {/* ---------- Menu e produtos ---------- */}
        <StatSection
          title={t("adminEstatisticas.menu.section")}
          hint={t("adminEstatisticas.menu.sectionHint")}
        >
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <StatCard
              title={t("adminEstatisticas.menu.topDishes")}
              subtitle={t("adminEstatisticas.menu.topDishesSub")}
            >
              {stats.topDishes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("adminEstatisticas.menu.topDishesEmpty")}
                </p>
              ) : (
                <div className="space-y-3">
                  {stats.topDishes.map((d, i) => (
                    <div key={d.item.id} className="flex items-center gap-3">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface text-xs font-bold text-muted-foreground">
                        {i + 1}
                      </span>
                      <img
                        src={d.item.image}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-lg bg-surface object-contain"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {d.item.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("adminEstatisticas.menu.sold", { qty: d.qty })} ·{" "}
                          {pct(d.revenue, stats.goodsAll)}%
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-bold text-primary">
                        {formatKz(d.revenue)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </StatCard>
            <StatCard
              title={t("adminEstatisticas.menu.categoryRevenue")}
              subtitle={t("adminEstatisticas.menu.categoryRevenueSub")}
            >
              {stats.categoryRevenue.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("adminEstatisticas.emptyGeneric")}
                </p>
              ) : (
                <div className="space-y-4">
                  {stats.categoryRevenue.map((r) => (
                    <div key={r.key}>
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="flex items-center gap-2 font-medium text-foreground">
                          <span className={`h-2 w-2 rounded-full ${r.tone}`} />
                          {r.label}
                        </span>
                        <span className="tabular-nums text-muted-foreground">
                          <span className="font-bold text-foreground">{formatKz(r.count)}</span> ·{" "}
                          {r.pct}%
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface">
                        <div
                          className={`h-full rounded-full ${r.tone}`}
                          style={{ width: `${Math.max(r.pct, 2)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </StatCard>
          </div>
        </StatSection>

        {/* ---------- Clientes ---------- */}
        <StatSection
          title={t("adminEstatisticas.customers.section")}
          hint={t("adminEstatisticas.customers.sectionHint")}
        >
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiTile
              icon={Users}
              tone="primary"
              label={t("adminEstatisticas.kpi.uniqueCustomers")}
              value={String(stats.uniqueCustomers)}
              hint={t("adminEstatisticas.kpi.uniqueCustomersHint")}
            />
            <KpiTile
              icon={Repeat}
              tone="success"
              label={t("adminEstatisticas.kpi.returnRate")}
              value={`${stats.returnRate}%`}
              hint={t("adminEstatisticas.kpi.returnRateHint", {
                returning: stats.returning,
                total: stats.uniqueCustomers,
              })}
            >
              <MiniProgress pct={stats.returnRate} />
            </KpiTile>
            <KpiTile
              icon={CreditCard}
              tone="brand"
              label={t("adminEstatisticas.kpi.spendPerCustomer")}
              value={formatKz(stats.spendPerCustomer)}
              hint={t("adminEstatisticas.kpi.spendPerCustomerHint")}
            />
            <KpiTile
              icon={Clock3}
              tone="muted"
              big={false}
              label={t("adminEstatisticas.kpi.avgTicket")}
              value={formatKz(stats.avgTicket)}
              hint={t("adminEstatisticas.kpi.avgTicketHint")}
            />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <StatCard
              title={t("adminEstatisticas.customers.newReturning")}
              subtitle={t("adminEstatisticas.customers.sectionHint")}
            >
              {stats.uniqueCustomers ? (
                <StatBars rows={stats.newReturning} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("adminEstatisticas.emptyGeneric")}
                </p>
              )}
            </StatCard>
            <StatCard
              title={t("adminEstatisticas.customers.topSpenders")}
              subtitle={t("adminEstatisticas.customers.topSpendersSub")}
            >
              {stats.topSpenders.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("adminEstatisticas.customers.topSpendersEmpty")}
                </p>
              ) : (
                <div className="space-y-3">
                  {stats.topSpenders.map((c, i) => (
                    <div key={`${c.name}-${i}`} className="flex items-center gap-3">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface text-xs font-bold text-muted-foreground">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{c.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {t("adminEstatisticas.customers.ordersCount", { count: c.orders })}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-bold text-primary">
                        {formatKz(c.spent)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </StatCard>
          </div>
        </StatSection>

        {/* ---------- Avaliações ---------- */}
        <StatSection
          title={t("adminEstatisticas.reviews.section")}
          hint={t("adminEstatisticas.reviews.sectionHint")}
        >
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <StatCard
              title={t("adminEstatisticas.reviews.distribution")}
              subtitle={t("adminEstatisticas.reviews.distributionSub", { count: reviews.length })}
            >
              {reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("adminEstatisticas.reviews.distributionEmpty")}
                </p>
              ) : (
                <StatBars rows={ratingRows} />
              )}
            </StatCard>
            <StatCard
              title={t("adminEstatisticas.reviews.tags")}
              subtitle={t("adminEstatisticas.reviews.tagsSub")}
            >
              {topTags.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("adminEstatisticas.reviews.tagsEmpty")}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {topTags.map(([tag, count]) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-xs font-medium text-foreground"
                    >
                      {tag}
                      <span className="rounded-full bg-primary/15 px-1.5 text-[11px] font-bold text-primary">
                        {count}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </StatCard>
          </div>
        </StatSection>
      </div>
    </div>
  );
}
