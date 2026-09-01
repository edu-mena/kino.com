import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bike,
  CalendarCheck,
  ChevronRight,
  CircleCheck,
  Clock3,
  CreditCard,
  LifeBuoy,
  Megaphone,
  Soup,
  Sparkles,
  Star,
  Store,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { useMemo } from "react";
import { KpiTile, StatCard, StatSection, TrendArea, TrendBadge } from "@/components/admin-stats";
import { AdminPageHeading } from "@/components/admin-shell";
import { getReviewsForRestaurant } from "@/data/helpers";
import { useTranslation } from "@/i18n";
import { isOpenNow, nextOpenAt } from "@/lib/opening-hours";
import { useCart } from "@/lib/cart";
import { useCouriers } from "@/lib/couriers";
import { PLAN_PRICE } from "@/data/subscriptions-store";
import { formatKz } from "@/lib/format";
import { useSubscriptions } from "@/lib/subscriptions";
import { useMenuAdmin } from "@/lib/menu-admin";
import { useMenusAdmin } from "@/lib/menus-admin";
import { useOffersAdmin } from "@/lib/offers-admin";
import { useReservations } from "@/lib/reservations";
import { useRestaurantAdmin } from "@/lib/restaurant-admin";
import { useStoriesAdmin } from "@/lib/stories-admin";
import { BCP47, last8Weeks } from "@/lib/week";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Painel — Kino.com" }] }),
  component: AdminDashboard,
});

const pctDelta = (cur: number, prev: number) =>
  prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null;

function AdminDashboard() {
  const { restaurant } = useRestaurantAdmin();
  const { orders, orderTotal } = useCart();
  const { reservations } = useReservations();
  const { items } = useMenuAdmin();
  const { menusByRestaurant } = useMenusAdmin();
  const { offersByRestaurant } = useOffersAdmin();
  const { storiesByRestaurant } = useStoriesAdmin();
  const { available } = useCouriers();
  const { byRestaurant: subByRestaurant } = useSubscriptions();
  const { t, locale } = useTranslation();

  const restaurantId = restaurant?.id ?? "";

  const mineOrders = useMemo(
    () => orders.filter((o) => o.restaurantId === restaurantId),
    [orders, restaurantId],
  );
  const mineResv = useMemo(
    () => reservations.filter((r) => r.restaurantId === restaurantId),
    [reservations, restaurantId],
  );

  const weeks = useMemo(() => {
    return last8Weeks().map((start) => {
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      const from = start.getTime();
      const to = end.getTime();
      const delivered = mineOrders.filter((o) => {
        if (o.status !== "delivered") return false;
        const ts = new Date(o.createdAt).getTime();
        return ts >= from && ts < to;
      });
      return {
        label: start.toLocaleDateString(BCP47[locale], { day: "2-digit", month: "short" }),
        revenue: delivered.reduce((s, o) => s + orderTotal(o), 0),
      };
    });
  }, [mineOrders, locale, orderTotal]);

  if (!restaurant) return null;

  const todayStr = new Date().toISOString().slice(0, 10);
  const in7 = new Date();
  in7.setDate(in7.getDate() + 7);
  const in7Str = in7.toISOString().slice(0, 10);

  const pendingOrders = mineOrders.filter((o) => o.status === "pending").length;
  const activeDeliveries = mineOrders.filter(
    (o) => o.status === "accepted" || o.status === "onTheWay",
  ).length;
  const deliveredOrders = mineOrders.filter((o) => o.status === "delivered");
  const totalRevenue = deliveredOrders.reduce((s, o) => s + orderTotal(o), 0);
  const todayOrders = mineOrders.filter((o) => o.createdAt.slice(0, 10) === todayStr).length;

  const pendingReservations = mineResv.filter((r) => r.status === "Pendente").length;
  const upcomingReservations = mineResv.filter(
    (r) => r.status === "Confirmada" && r.date >= todayStr && r.date <= in7Str,
  ).length;

  const menuItems = items.filter((m) => m.restaurantId === restaurant.id);
  const unavailableCount = menuItems.filter((m) => !m.isAvailable).length;
  const menus = menusByRestaurant(restaurant.id);
  const draftMenus = menus.filter((m) => !m.isActive).length;

  const reviews = getReviewsForRestaurant(restaurant.id);
  const offers = offersByRestaurant(restaurant.id);
  const stories = storiesByRestaurant(restaurant.id);

  const uniqueCustomers = new Set(
    mineOrders
      .filter((o) => o.status !== "rejected")
      .map((o) => o.customerEmail || o.customerPhone || o.customerName),
  ).size;

  const revenueDelta = pctDelta(weeks[6]?.revenue ?? 0, weeks[5]?.revenue ?? 0);

  // --- Precisa de atenção ---
  const attention = [
    {
      to: "/admin/pedidos" as const,
      icon: Bike,
      value: pendingOrders,
      label: t("adminIndex.attnOrders"),
    },
    {
      to: "/admin/reservas" as const,
      icon: CalendarCheck,
      value: pendingReservations,
      label: t("adminIndex.attnReservations"),
    },
    {
      to: "/admin/cardapio" as const,
      icon: Soup,
      value: unavailableCount,
      label: t("adminIndex.attnMenu"),
    },
  ];
  const allClear = attention.every((a) => a.value === 0);

  // --- Todas as áreas ---
  const areas: {
    to:
      | "/admin/pedidos"
      | "/admin/reservas"
      | "/admin/cardapio"
      | "/admin/estatisticas"
      | "/admin/clientes"
      | "/admin/stories"
      | "/admin/promocoes"
      | "/admin/avaliacoes"
      | "/admin/perfil"
      | "/admin/suporte";
    icon: typeof Bike;
    name: string;
    desc: string;
    badge?: string;
  }[] = [
    {
      to: "/admin/pedidos",
      icon: Bike,
      name: t("adminNav.orders"),
      desc: t("adminIndex.areaOrders"),
      badge: t("adminIndex.badgePending", { count: pendingOrders }),
    },
    {
      to: "/admin/reservas",
      icon: CalendarCheck,
      name: t("adminNav.reservations"),
      desc: t("adminIndex.areaReservations"),
      badge: t("adminIndex.badgePending", { count: pendingReservations }),
    },
    {
      to: "/admin/cardapio",
      icon: Soup,
      name: t("adminNav.menu"),
      desc: t("adminIndex.areaMenu"),
      badge: t("adminIndex.badgeDishes", { count: menuItems.length }),
    },
    {
      to: "/admin/estatisticas",
      icon: TrendingUp,
      name: t("adminNav.stats"),
      desc: t("adminIndex.areaStats"),
    },
    {
      to: "/admin/clientes",
      icon: Users,
      name: t("adminNav.customers"),
      desc: t("adminIndex.areaCustomers"),
      badge: t("adminIndex.badgeCustomers", { count: uniqueCustomers }),
    },
    {
      to: "/admin/stories",
      icon: Sparkles,
      name: t("adminNav.stories"),
      desc: t("adminIndex.areaStories"),
      badge: t("adminIndex.badgeActive", { count: stories.length }),
    },
    {
      to: "/admin/promocoes",
      icon: Megaphone,
      name: t("adminNav.promotions"),
      desc: t("adminIndex.areaPromotions"),
      badge: t("adminIndex.badgeActive", { count: offers.length }),
    },
    {
      to: "/admin/avaliacoes",
      icon: Star,
      name: t("adminNav.reviews"),
      desc: t("adminIndex.areaReviews"),
      badge: t("adminIndex.badgeCount", { count: reviews.length }),
    },
    {
      to: "/admin/perfil",
      icon: Store,
      name: t("adminNav.restaurant"),
      desc: t("adminIndex.areaRestaurant"),
    },
    {
      to: "/admin/suporte",
      icon: LifeBuoy,
      name: t("adminNav.support"),
      desc: t("adminIndex.areaSupport"),
    },
  ];

  return (
    <div className="pb-20">
      <AdminPageHeading
        eyebrow={t("adminIndex.eyebrow")}
        title={t("adminIndex.greeting", { name: restaurant.name })}
        description={t("adminIndex.description")}
      />

      <div className="mx-auto max-w-6xl px-4 md:px-6">
        {/* ---------- Precisa de atenção ---------- */}
        <section className="mt-8">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h2 className="font-display text-lg font-bold text-foreground">
              {t("adminIndex.attnTitle")}
            </h2>
            {activeDeliveries > 0 && (
              <p className="text-xs text-muted-foreground">
                {t("adminIndex.activeDeliveries", { count: activeDeliveries })}
              </p>
            )}
          </div>

          {allClear ? (
            <div className="card-soft mt-4 flex items-center gap-3 p-5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-success/10 text-success">
                <CircleCheck className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {t("adminIndex.allClearTitle")}
                </p>
                <p className="text-xs text-muted-foreground">{t("adminIndex.allClearHint")}</p>
              </div>
            </div>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                    <span
                      className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
                        active ? "bg-brand/10 text-brand" : "bg-surface text-muted-foreground"
                      }`}
                    >
                      <a.icon className="h-5 w-5" />
                    </span>
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

        {/* ---------- Visão geral ---------- */}
        <StatSection title={t("adminIndex.overviewTitle")} hint={t("adminIndex.overviewHint")}>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <StatCard
              wide
              title={t("adminIndex.revenueChartTitle")}
              subtitle={t("adminIndex.revenueChartSub")}
              right={<TrendBadge delta={revenueDelta} label={t("adminIndex.vsPrevWeek")} />}
            >
              <TrendArea
                points={weeks.map((w) => ({ label: w.label, a: w.revenue }))}
                legendA={t("adminIndex.revenueLegend")}
              />
            </StatCard>

            <div className="grid gap-4">
              <KpiTile
                icon={Wallet}
                tone="success"
                label={t("adminIndex.kpiRevenue")}
                value={formatKz(totalRevenue)}
                hint={t("adminIndex.kpiRevenueHint", { count: deliveredOrders.length })}
              />
              <KpiTile
                icon={TrendingUp}
                tone="primary"
                label={t("adminIndex.kpiToday")}
                value={String(todayOrders)}
                hint={t("adminIndex.kpiTodayHint", { count: mineOrders.length })}
              />
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiTile
              icon={CalendarCheck}
              tone="brand"
              big={false}
              label={t("adminIndex.kpiUpcoming")}
              value={String(upcomingReservations)}
              hint={t("adminIndex.kpiUpcomingHint")}
            />
            <KpiTile
              icon={Star}
              tone="muted"
              big={false}
              label={t("adminIndex.kpiRating")}
              value={restaurant.rating.toFixed(1)}
              hint={t("adminIndex.kpiRatingHint", { count: reviews.length })}
            />
            <KpiTile
              icon={Soup}
              tone="primary"
              big={false}
              label={t("adminIndex.kpiMenu")}
              value={String(menuItems.length)}
              hint={
                draftMenus > 0
                  ? t("adminIndex.kpiMenuDraftHint", { count: draftMenus })
                  : t("adminIndex.kpiMenuHint", { count: menus.length })
              }
            />
            <KpiTile
              icon={Bike}
              tone={available.length > 0 ? "success" : "brand"}
              big={false}
              label={t("adminIndex.kpiCouriers")}
              value={String(available.length)}
              hint={t("adminIndex.kpiCouriersHint")}
            />
          </div>

          {(() => {
            const paused = restaurant.ordersPausedManually;
            const open = restaurant.hours ? isOpenNow(restaurant.hours) : true;
            return (
              <Link
                to="/admin/perfil"
                className={`card-soft group mt-4 flex items-center gap-4 p-5 transition-colors hover:border-primary ${
                  paused || !open ? "border-brand/40" : ""
                }`}
              >
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                    paused
                      ? "bg-destructive/10 text-destructive"
                      : open
                        ? "bg-success/10 text-success"
                        : "bg-brand/10 text-brand"
                  }`}
                >
                  <Clock3 className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {paused
                      ? t("adminIndex.stateOrdersPaused")
                      : open
                        ? t("adminIndex.stateOpenNow")
                        : t("adminIndex.stateClosedNow", {
                            opensAt: restaurant.hours
                              ? (nextOpenAt(restaurant.hours, locale) ?? "")
                              : "",
                          })}
                  </p>
                  <p className="text-xs text-muted-foreground">{t("adminIndex.stateHint")}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            );
          })()}

          {(() => {
            const sub = subByRestaurant(restaurant.id);
            if (!sub) return null;
            const tone =
              sub.status === "active" || sub.status === "trial"
                ? "text-success"
                : sub.status === "overdue"
                  ? "text-brand"
                  : "text-destructive";
            return (
              <Link
                to="/admin/subscricao"
                className="card-soft group mt-4 flex items-center gap-4 p-5 transition-colors hover:border-primary"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <CreditCard className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {t("adminIndex.subscriptionTitle")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(`sistema.plan.${sub.plan}`)} · {formatKz(PLAN_PRICE[sub.plan])}
                    {t("adminSubscricao.perMonth")} ·{" "}
                    <span className={`font-semibold ${tone}`}>
                      {t(`sistema.subStatus.${sub.status}`)}
                    </span>
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            );
          })()}
        </StatSection>

        {/* ---------- Todas as áreas ---------- */}
        <StatSection title={t("adminIndex.areasTitle")} hint={t("adminIndex.areasHint")}>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {areas.map((a) => (
              <Link
                key={a.to}
                to={a.to}
                className="card-soft group flex items-start gap-3 p-4 transition-colors hover:border-brand"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <a.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-display text-sm font-bold text-foreground">{a.name}</p>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{a.desc}</p>
                  {a.badge && (
                    <span className="mt-2 inline-block rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      {a.badge}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </StatSection>

        {/* ---------- Restaurante ---------- */}
        <div className="mt-10 card-soft flex flex-wrap items-center gap-4 p-5">
          <img
            src={restaurant.coverImage}
            alt=""
            className="h-14 w-14 shrink-0 rounded-xl object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-base font-bold text-foreground">
              {restaurant.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {restaurant.cuisine} · {restaurant.neighborhood} ·{" "}
              {restaurant.isDeliveryAvailable
                ? t("adminIndex.withDelivery")
                : t("adminIndex.withoutDelivery")}
            </p>
          </div>
          <Link
            to="/admin/perfil"
            className="shrink-0 rounded-xl border border-border px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary"
          >
            {t("adminIndex.viewProfile")}
          </Link>
        </div>
      </div>
    </div>
  );
}
