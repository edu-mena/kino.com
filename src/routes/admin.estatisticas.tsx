import { createFileRoute } from "@tanstack/react-router";
import { Bike, CalendarCheck, Star, TrendingUp } from "lucide-react";
import { AdminPageHeading } from "@/components/admin-shell";
import { getMenuItem, getReviewsForRestaurant } from "@/data/helpers";
import { useTranslation } from "@/i18n";
import { useCart } from "@/lib/cart";
import { formatKz } from "@/lib/format";
import { useReservations } from "@/lib/reservations";
import { useRestaurantAdmin } from "@/lib/restaurant-admin";

export const Route = createFileRoute("/admin/estatisticas")({
  head: () => ({ meta: [{ title: "Estatísticas — Painel Kino.com" }] }),
  component: AdminEstatisticas,
});

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="card-soft p-5">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-3 font-display text-2xl font-extrabold text-primary">{value}</p>
      <p className="text-sm font-semibold text-foreground">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function AdminEstatisticas() {
  const { restaurant } = useRestaurantAdmin();
  const { orders, orderTotal } = useCart();
  const { reservations } = useReservations();
  const { t } = useTranslation();

  if (!restaurant) return null;

  const restaurantOrders = orders.filter((o) => o.restaurantId === restaurant.id);
  const deliveredOrders = restaurantOrders.filter((o) => o.status === "delivered");
  const revenue = deliveredOrders.reduce((sum, o) => sum + orderTotal(o), 0);

  const dishCounts = new Map<string, number>();
  for (const order of restaurantOrders) {
    if (order.status === "rejected") continue;
    for (const line of order.lines) {
      dishCounts.set(line.menuItemId, (dishCounts.get(line.menuItemId) ?? 0) + line.qty);
    }
  }
  const topDishes = [...dishCounts.entries()]
    .map(([id, qty]) => ({ item: getMenuItem(id), qty }))
    .filter((d): d is { item: NonNullable<typeof d.item>; qty: number } => !!d.item)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  const restaurantReservations = reservations.filter((r) => r.restaurantId === restaurant.id);
  const confirmedReservations = restaurantReservations.filter((r) => r.status === "Confirmada");
  const respondedReservations = restaurantReservations.filter((r) => r.status !== "Pendente");
  const acceptanceRate =
    respondedReservations.length > 0
      ? Math.round((confirmedReservations.length / respondedReservations.length) * 100)
      : null;
  const peopleServed = confirmedReservations.reduce((sum, r) => sum + r.peopleCount, 0);

  const reviews = getReviewsForRestaurant(restaurant.id);
  const ratingCounts = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: reviews.filter((r) => r.rating === stars).length,
  }));
  const maxRatingCount = Math.max(1, ...ratingCounts.map((r) => r.count));

  return (
    <div className="pb-16">
      <AdminPageHeading
        eyebrow={t("adminEstatisticas.eyebrow")}
        title={t("adminEstatisticas.title")}
        description={t("adminEstatisticas.description")}
      />

      <div className="mx-auto mt-8 grid max-w-6xl gap-4 px-4 sm:grid-cols-2 md:px-6 lg:grid-cols-4">
        <StatCard
          icon={Bike}
          label={t("adminEstatisticas.deliveredRevenue")}
          value={formatKz(revenue)}
          hint={t("adminEstatisticas.deliveredHint", {
            delivered: deliveredOrders.length,
            total: restaurantOrders.length,
          })}
        />
        <StatCard
          icon={CalendarCheck}
          label={t("adminEstatisticas.confirmedReservations")}
          value={String(confirmedReservations.length)}
          hint={
            acceptanceRate !== null
              ? t("adminEstatisticas.acceptanceRateHint", { rate: acceptanceRate })
              : t("adminEstatisticas.noResponsesYet")
          }
        />
        <StatCard
          icon={TrendingUp}
          label={t("adminEstatisticas.peopleServed")}
          value={String(peopleServed)}
          hint={t("adminEstatisticas.peopleServedHint")}
        />
        <StatCard
          icon={Star}
          label={t("adminEstatisticas.averageRating")}
          value={restaurant.rating.toFixed(1)}
          hint={t("adminEstatisticas.detailedReviewsHint", { count: reviews.length })}
        />
      </div>

      <div className="mx-auto mt-8 grid max-w-6xl gap-4 px-4 md:px-6 lg:grid-cols-2">
        <div className="card-soft p-5">
          <h2 className="font-display text-base font-bold text-foreground">
            {t("adminEstatisticas.topDishesTitle")}
          </h2>
          {topDishes.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {t("adminEstatisticas.topDishesEmpty")}
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {topDishes.map(({ item, qty }, i) => (
                <div key={item.id} className="flex items-center gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface text-xs font-bold text-muted-foreground">
                    {i + 1}
                  </span>
                  <img
                    src={item.image}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-lg bg-surface object-contain"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                    {item.name}
                  </span>
                  <span className="shrink-0 text-sm font-bold text-primary">{qty}×</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card-soft p-5">
          <h2 className="font-display text-base font-bold text-foreground">
            {t("adminEstatisticas.ratingDistributionTitle")}
          </h2>
          {reviews.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {t("adminEstatisticas.ratingDistributionEmpty")}
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {ratingCounts.map(({ stars, count }) => (
                <div key={stars} className="flex items-center gap-3">
                  <span className="flex w-10 shrink-0 items-center gap-0.5 text-xs font-semibold text-muted-foreground">
                    {stars} <Star className="h-3 w-3 fill-star text-star" />
                  </span>
                  <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-surface">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(count / maxRatingCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-4 shrink-0 text-right text-xs font-semibold text-muted-foreground">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
