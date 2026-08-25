import { createFileRoute } from "@tanstack/react-router";
import { Bike, Check, MapPin, Package, X } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeading } from "@/components/admin-shell";
import { getMenuItem } from "@/data/helpers";
import { useTranslation } from "@/i18n";
import { lineUnitPrice, useCart, type CartOrder, type CartOrderStatus } from "@/lib/cart";
import { formatKz } from "@/lib/format";
import { useRestaurantAdmin } from "@/lib/restaurant-admin";

export const Route = createFileRoute("/admin/pedidos")({
  head: () => ({ meta: [{ title: "Pedidos — Painel Kino.com" }] }),
  component: AdminPedidos,
});

const statusToneMap: Record<CartOrderStatus, string> = {
  pending: "bg-brand/15 text-brand",
  accepted: "bg-primary/15 text-primary",
  onTheWay: "bg-primary/15 text-primary",
  delivered: "bg-success/15 text-success",
  rejected: "bg-destructive/15 text-destructive",
};

function AdminPedidos() {
  const { restaurant } = useRestaurantAdmin();
  const { orders, orderTotal, updateOrderStatus } = useCart();
  const { t } = useTranslation();

  const statusLabels: Record<CartOrderStatus, string> = {
    pending: t("adminPedidos.statusPending"),
    accepted: t("adminPedidos.statusAccepted"),
    onTheWay: t("adminPedidos.statusOnTheWay"),
    delivered: t("adminPedidos.statusDelivered"),
    rejected: t("adminPedidos.statusRejected"),
  };

  if (!restaurant) return null;

  const restaurantOrders = orders
    .filter((o) => o.restaurantId === restaurant.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const advance = (order: CartOrder) => {
    const next: CartOrderStatus =
      order.status === "pending"
        ? "accepted"
        : order.status === "accepted"
          ? "onTheWay"
          : "delivered";
    updateOrderStatus(order.id, next);
    toast.success(t("adminPedidos.updatedToast", { status: statusLabels[next] }));
  };

  const reject = (order: CartOrder) => {
    updateOrderStatus(order.id, "rejected");
    toast.success(t("adminPedidos.rejectedToast"));
  };

  return (
    <div className="pb-16">
      <AdminPageHeading
        eyebrow={t("adminPedidos.eyebrow")}
        title={t("adminPedidos.title")}
        description={t("adminPedidos.description")}
      />

      <div className="mx-auto mt-8 max-w-4xl space-y-3 px-4 md:px-6">
        {restaurantOrders.length === 0 && (
          <div className="card-soft grid place-items-center gap-3 p-12 text-center">
            <Package className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("adminPedidos.emptyText")}</p>
          </div>
        )}

        {restaurantOrders.map((order) => (
          <div key={order.id} className="card-soft p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                {order.deliveryAddress.label} — {order.deliveryAddress.line1}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${statusToneMap[order.status]}`}
              >
                {statusLabels[order.status]}
              </span>
            </div>

            {order.note && (
              <p className="mt-3 rounded-lg bg-surface p-2.5 text-xs text-foreground">
                <span className="font-bold">{t("adminPedidos.observationLabel")}:</span>{" "}
                {order.note}
              </p>
            )}

            <ul className="mt-4 space-y-1.5 border-t border-border pt-3">
              {order.lines.map((line) => {
                const item = getMenuItem(line.menuItemId);
                if (!item) return null;
                return (
                  <li key={line.key} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 text-sm">
                    <span className="min-w-0 truncate text-muted-foreground">
                      {line.qty}× {item.name}
                    </span>
                    <span className="shrink-0 font-semibold">
                      {formatKz(lineUnitPrice(line) * line.qty)}
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm">
              <span className="font-bold">{t("adminPedidos.total")}</span>
              <span className="font-extrabold text-primary">{formatKz(orderTotal(order))}</span>
            </div>

            {order.status !== "delivered" && order.status !== "rejected" && (
              <div className="mt-4 flex gap-2">
                {order.status === "pending" && (
                  <button
                    type="button"
                    onClick={() => reject(order)}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-destructive/50 px-4 py-2.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/5"
                  >
                    <X className="h-3.5 w-3.5" />
                    {t("adminPedidos.reject")}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => advance(order)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  {order.status === "pending" && <Check className="h-3.5 w-3.5" />}
                  {order.status === "onTheWay" && <Bike className="h-3.5 w-3.5" />}
                  {order.status === "pending"
                    ? t("adminPedidos.acceptOrder")
                    : order.status === "accepted"
                      ? t("adminPedidos.markOnTheWay")
                      : t("adminPedidos.markDelivered")}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
