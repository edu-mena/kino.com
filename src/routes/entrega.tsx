import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bike,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Package,
  Phone,
  Trash2,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import icon from "@/assets/icon.png";
import { PageHeading, PageShell } from "@/components/site-shell";
import { getMenuItem, getRestaurant } from "@/data/helpers";
import { lineUnitPrice, useCart, type CartOrder } from "@/lib/cart";
import { formatKz } from "@/lib/format";
import { paymentMethods } from "@/lib/mock-data";
import { useTranslation } from "@/i18n";

export const Route = createFileRoute("/entrega")({
  head: () => ({
    meta: [
      { title: "Entrega — Kino.com" },
      {
        name: "description",
        content: "Acompanhe os seus pedidos de entrega — estado, contacto e detalhe de cada um.",
      },
      { property: "og:title", content: "Entrega — Kino.com" },
      { property: "og:description", content: "Acompanhe os seus pedidos de entrega." },
      { property: "og:image", content: icon },
    ],
  }),
  component: Entrega,
});

/** "19:45" — hora estimada de chegada, calculada a partir de quando o pedido foi criado. */
function arrivalTime(order: CartOrder) {
  const arrival = new Date(new Date(order.createdAt).getTime() + order.estimatedMinutes * 60_000);
  return arrival.toLocaleTimeString("pt-AO", { hour: "2-digit", minute: "2-digit" });
}

/** O estado fica guardado como código, nunca já traduzido — assim trocar
 * de idioma atualiza pedidos já existentes. */
function statusLabel(status: CartOrder["status"], t: ReturnType<typeof useTranslation>["t"]) {
  const key = {
    pending: "statusPending",
    accepted: "statusAccepted",
    onTheWay: "statusOnTheWay",
    delivered: "statusDelivered",
    rejected: "statusRejected",
  }[status];
  return t(`entrega.${key}`);
}

function Entrega() {
  const { orders } = useCart();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const active = activeIndex !== null ? (orders[activeIndex] ?? null) : null;
  const { t } = useTranslation();

  return (
    <PageShell>
      <PageHeading
        eyebrow={t("entrega.eyebrow")}
        title={t("entrega.title")}
        description={t("entrega.description")}
      />
      <div className="mx-auto mt-8 max-w-5xl px-4 md:px-6">
        {/* Mobile: um card de cada vez (lista ↔ visualização). Desktop: lado a lado. */}
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <div className={`min-w-0 ${activeIndex !== null ? "hidden lg:block" : "block"}`}>
            {orders.length === 0 ? (
              <div className="card-soft grid place-items-center gap-3 p-12 text-center">
                <Bike className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{t("entrega.emptyTitle")}</p>
                <p className="max-w-xs text-xs text-muted-foreground">{t("entrega.emptyHint")}</p>
                <Link
                  to="/cardapio"
                  className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
                >
                  {t("entrega.seeMenu")}
                </Link>
              </div>
            ) : (
              <div className="card-soft divide-y divide-border">
                {orders.map((order, index) => {
                  const restaurant = getRestaurant(order.restaurantId);
                  const itemCount = order.lines.reduce((sum, l) => sum + l.qty, 0);
                  return (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => setActiveIndex(index)}
                      className={`group grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4 text-left transition-colors hover:bg-surface ${
                        activeIndex === index ? "bg-surface" : ""
                      }`}
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                        <Bike className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold">
                          {restaurant?.name ?? "Restaurante"}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {itemCount} {itemCount === 1 ? t("entrega.itemSingular") : t("entrega.itemPlural")} · {statusLabel(order.status, t)}
                        </span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Card de visualização */}
          <div className={`min-w-0 ${activeIndex !== null ? "block" : "hidden lg:block"}`}>
            <div className="card-soft sticky top-24 p-6">
              {active ? (
                <OrderViewer order={active} onBack={() => setActiveIndex(null)} />
              ) : (
                <div className="grid place-items-center gap-3 py-12 text-center">
                  <Package className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">{t("entrega.chooseOrderHint")}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

function OrderViewer({ order, onBack }: { order: CartOrder; onBack: () => void }) {
  const { removeOrder, orderTotal } = useCart();
  const restaurant = getRestaurant(order.restaurantId);
  const { t } = useTranslation();

  return (
    <>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary lg:hidden"
      >
        <ChevronLeft className="h-4 w-4" /> {t("common.back")}
      </button>

      <div className="flex items-center gap-3">
        {restaurant && (
          <img
            src={restaurant.coverImage}
            alt=""
            className="h-12 w-12 shrink-0 rounded-xl object-cover"
          />
        )}
        <div className="min-w-0">
          <h2 className="truncate font-display text-xl font-bold text-primary">
            {restaurant?.name ?? "Restaurante"}
          </h2>
          {restaurant && (
            <p className="truncate text-xs text-muted-foreground">
              {restaurant.cuisine} · {restaurant.neighborhood}
            </p>
          )}
        </div>
      </div>

      <dl className="mt-5 space-y-4 text-sm">
        <div className="flex items-start gap-3">
          <Bike className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {t("entrega.deliveryStatus")}
            </dt>
            <dd className="mt-0.5">{statusLabel(order.status, t)}</dd>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {t("entrega.eta")}
            </dt>
            <dd className="mt-0.5">~{arrivalTime(order)}</dd>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {t("entrega.deliverTo")}
            </dt>
            <dd className="mt-0.5 truncate">
              {order.deliveryAddress.label} — {order.deliveryAddress.line1}
            </dd>
          </div>
        </div>

        {restaurant && (
          <div className="flex items-start gap-3">
            <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {t("entrega.complaintContact")}
              </dt>
              <dd className="mt-0.5">{restaurant.phone}</dd>
            </div>
          </div>
        )}

        {order.paymentMethod && (
          <div className="flex items-start gap-3">
            <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {t("entrega.paymentPreference")}
              </dt>
              <dd className="mt-0.5">
                {paymentMethods.find((m) => m.id === order.paymentMethod)?.label ??
                  order.paymentMethod}
              </dd>
            </div>
          </div>
        )}
      </dl>

      <div className="mt-5 border-t border-border pt-4">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{t("entrega.products")}</p>
        <ul className="mt-2 space-y-2">
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
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-base">
        <span className="font-bold">{t("entrega.amount")}</span>
        <span className="font-extrabold text-primary">{formatKz(orderTotal(order))}</span>
      </div>

      {!order.paymentMethod && (
        <Link
          to="/checkout"
          className="mt-4 block rounded-xl bg-brand px-5 py-3 text-center text-sm font-bold text-brand-foreground transition-opacity hover:opacity-90"
        >
          {t("entrega.finalizeOrder")}
        </Link>
      )}

      <button
        type="button"
        onClick={() => {
          removeOrder(order.id);
          onBack();
        }}
        className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
      >
        <Trash2 className="h-3.5 w-3.5" />
        {t("entrega.cancelOrder")}
      </button>
    </>
  );
}
