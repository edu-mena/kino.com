import { createFileRoute, Link } from "@tanstack/react-router";
import { Bike, CalendarCheck, ChevronRight, Soup, Star } from "lucide-react";
import { AdminPageHeading } from "@/components/admin-shell";
import { getReviewsForRestaurant } from "@/data/helpers";
import { useTranslation } from "@/i18n";
import { useCart } from "@/lib/cart";
import { useMenuAdmin } from "@/lib/menu-admin";
import { useReservations } from "@/lib/reservations";
import { useRestaurantAdmin } from "@/lib/restaurant-admin";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [{ title: "Painel — Kino.com" }],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const { restaurant } = useRestaurantAdmin();
  const { orders } = useCart();
  const { reservations } = useReservations();
  // `items` (não `getMenuItemsByRestaurant`) — o painel precisa de contar
  // também os pratos de cardápios em rascunho, não só os visíveis ao cliente.
  const { items } = useMenuAdmin();
  const { t } = useTranslation();

  if (!restaurant) return null;

  const restaurantOrders = orders.filter((o) => o.restaurantId === restaurant.id);
  const pendingOrders = restaurantOrders.filter((o) => o.status === "pending").length;
  const restaurantReservations = reservations.filter((r) => r.restaurantId === restaurant.id);
  const pendingReservations = restaurantReservations.filter((r) => r.status === "Pendente").length;
  const menuItems = items.filter((m) => m.restaurantId === restaurant.id);
  const unavailableCount = menuItems.filter((m) => !m.isAvailable).length;
  const reviews = getReviewsForRestaurant(restaurant.id);

  const cards = [
    {
      to: "/admin/pedidos" as const,
      icon: Bike,
      label: t("adminIndex.pendingOrders"),
      value: pendingOrders,
      hint: t("adminIndex.totalOrdersHint", { count: restaurantOrders.length }),
    },
    {
      to: "/admin/reservas" as const,
      icon: CalendarCheck,
      label: t("adminIndex.pendingReservations"),
      value: pendingReservations,
      hint: t("adminIndex.totalReservationsHint", { count: restaurantReservations.length }),
    },
    {
      to: "/admin/cardapio" as const,
      icon: Soup,
      label: t("adminIndex.menuItems"),
      value: menuItems.length,
      hint:
        unavailableCount > 0
          ? t("adminIndex.unavailableHint", { count: unavailableCount })
          : t("adminIndex.allAvailableHint"),
    },
    {
      to: "/admin/avaliacoes" as const,
      icon: Star,
      label: t("adminIndex.averageRating"),
      value: restaurant.rating.toFixed(1),
      hint: t("adminIndex.reviewsHint", { count: reviews.length, total: restaurant.reviewCount }),
    },
  ];

  return (
    <div className="pb-16">
      <AdminPageHeading
        eyebrow={t("adminIndex.eyebrow")}
        title={t("adminIndex.greeting", { name: restaurant.name })}
        description={t("adminIndex.description")}
      />

      <div className="mx-auto mt-8 grid max-w-6xl gap-4 px-4 sm:grid-cols-2 md:px-6 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className="card-soft group flex flex-col gap-3 p-5 transition-colors hover:border-brand"
          >
            <div className="flex items-center justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <card.icon className="h-5 w-5" />
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </div>
            <div>
              <p className="font-display text-3xl font-extrabold text-primary">{card.value}</p>
              <p className="text-sm font-semibold text-foreground">{card.label}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{card.hint}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="mx-auto mt-8 max-w-6xl px-4 md:px-6">
        <div className="card-soft flex flex-wrap items-center gap-4 p-5">
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
