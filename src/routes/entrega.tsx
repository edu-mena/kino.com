import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bike,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  MessageSquare,
  Package,
  Phone,
  ShieldAlert,
  ShoppingBag,
  Star,
  Trash2,
  Upload,
  Users,
  Utensils,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import icon from "@/assets/icon.png";
import { ReviewDialog } from "@/components/review-dialog";
import { PageHeading, PageShell } from "@/components/site-shell";
import { getMenuItem, getRestaurant } from "@/data/helpers";
import { isRefReviewed } from "@/data/reviews-store";
import type { FulfillmentType } from "@/data/types";
import { useAuth } from "@/lib/auth";
import { lineCustomizations, lineUnitPrice, useCart, type CartOrder } from "@/lib/cart";
import { readCourierForOrder } from "@/lib/couriers";
import { viewerKey } from "@/lib/customer";
import { orderDistanceKm } from "@/lib/delivery-eval";
import { formatKz } from "@/lib/format";
import { fileToResizedDataUrl } from "@/lib/image-upload";
import { getPaymentMethod } from "@/lib/mock-data";
import { useDeliveryPolicy } from "@/lib/use-platform-settings";
import { useTranslation } from "@/i18n";

const MODE_ICON: Record<FulfillmentType, typeof Bike> = {
  delivery: Bike,
  takeaway: ShoppingBag,
  dinein: Utensils,
};

export const Route = createFileRoute("/entrega")({
  head: () => ({
    meta: [
      { title: "Entrega — Luku.com" },
      {
        name: "description",
        content: "Acompanhe os seus pedidos de entrega — estado, contacto e detalhe de cada um.",
      },
      { property: "og:title", content: "Entrega — Luku.com" },
      { property: "og:description", content: "Acompanhe os seus pedidos de entrega." },
      { property: "og:image", content: icon },
    ],
  }),
  component: Entrega,
});

const hhmm = (d: Date) => d.toLocaleTimeString("pt-AO", { hour: "2-digit", minute: "2-digit" });

/** Hora prevista mostrada ao cliente: para takeaway agendado é a hora de
 * levantamento escolhida; nos restantes, criação + estimativa. */
function etaTime(order: CartOrder) {
  if (order.fulfillmentType === "takeaway" && !order.pickupAsap && order.pickupAt) {
    return hhmm(new Date(order.pickupAt));
  }
  return hhmm(new Date(new Date(order.createdAt).getTime() + order.estimatedMinutes * 60_000));
}

/** O estado fica guardado como código, nunca já traduzido — assim trocar
 * de idioma atualiza pedidos já existentes. */
function statusLabel(status: CartOrder["status"], t: ReturnType<typeof useTranslation>["t"]) {
  const key = {
    pending: "statusPending",
    accepted: "statusAccepted",
    onTheWay: "statusOnTheWay",
    ready: "statusReady",
    delivered: "statusDelivered",
    completed: "statusCompleted",
    rejected: "statusRejected",
    canceled: "statusCanceled",
  }[status];
  return t(`entrega.${key}`);
}

function Entrega() {
  const { orders: allOrders } = useCart();
  const { user } = useAuth();
  // Só os pedidos de quem está a ver (conta ou convidado) — os da seed, sem
  // `ownerKey`, servem os painéis do restaurante, não esta página.
  const mineKey = viewerKey(user);
  const orders = useMemo(
    () => allOrders.filter((o) => o.ownerKey === mineKey),
    [allOrders, mineKey],
  );
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
                  const ModeIcon = MODE_ICON[order.fulfillmentType];
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
                        <ModeIcon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold">
                          {restaurant?.name ?? "Restaurante"}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {t(`fulfillment.${order.fulfillmentType}`)} · {itemCount}{" "}
                          {itemCount === 1 ? t("entrega.itemSingular") : t("entrega.itemPlural")} ·{" "}
                          {statusLabel(order.status, t)}
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
  const { cancelOrder, orderTotal, orderDiscount, setPaymentProof } = useCart();
  const deliveryPolicy = useDeliveryPolicy();
  const restaurant = getRestaurant(order.restaurantId);
  const { t } = useTranslation();
  const [proofUploading, setProofUploading] = useState(false);
  const canCancel = order.status === "pending";
  const isDelivery = order.fulfillmentType === "delivery";
  const subtotal = order.lines.reduce((s, l) => s + lineUnitPrice(l) * l.qty, 0);
  const deliveryFee = isDelivery ? orderTotal(order) - subtotal + orderDiscount(order) : 0;
  const surchargeKm = isDelivery
    ? Math.max(0, Math.ceil(orderDistanceKm(order) - deliveryPolicy.freeRadiusKm))
    : 0;
  const [reviewOpen, setReviewOpen] = useState(false);
  const reviewRef = `order:${order.id}`;
  const canReview =
    (order.status === "delivered" || order.status === "completed") && !isRefReviewed(reviewRef);
  const ModeIcon = MODE_ICON[order.fulfillmentType];
  const requiredPayment = getPaymentMethod(order.paymentMethod);
  const payDestination =
    order.paymentMethod && requiredPayment?.digital
      ? restaurant?.paymentDetails?.[order.paymentMethod]?.trim()
      : undefined;
  // O pagamento é devido depois de o restaurante aceitar e fixar um método
  // digital, e enquanto o pedido não terminou/foi recusado.
  const paymentDue =
    !!requiredPayment?.digital &&
    order.status !== "pending" &&
    order.status !== "rejected" &&
    order.status !== "canceled";

  const onProofFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setProofUploading(true);
    try {
      const dataUrl = await fileToResizedDataUrl(file, 1000);
      setPaymentProof(order.id, dataUrl);
      toast.success(t("entrega.proofSentToast"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("entrega.proofError"));
    } finally {
      setProofUploading(false);
    }
  };

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
          <ModeIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {t("entrega.deliveryStatus")}
            </dt>
            <dd className="mt-0.5">
              {t(`fulfillment.${order.fulfillmentType}`)} · {statusLabel(order.status, t)}
            </dd>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {order.fulfillmentType === "takeaway" ? t("entrega.pickupTime") : t("entrega.eta")}
            </dt>
            <dd className="mt-0.5">
              {order.fulfillmentType === "takeaway" && order.pickupAsap
                ? t("entrega.pickupAsap")
                : `~${etaTime(order)}`}
            </dd>
          </div>
        </div>

        {order.deliveryAddress && (
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
        )}

        {order.fulfillmentType === "takeaway" && restaurant && (
          <div className="flex items-start gap-3">
            <ShoppingBag className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {t("entrega.modeLabel")}
              </dt>
              <dd className="mt-0.5">{t("entrega.pickupHere", { name: restaurant.name })}</dd>
            </div>
          </div>
        )}

        {order.fulfillmentType === "dinein" && (
          <div className="flex items-start gap-3">
            <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {t("entrega.dineInHere")}
              </dt>
              <dd className="mt-0.5">
                {order.partySize ? t("entrega.partySize", { count: order.partySize }) : "—"}
              </dd>
            </div>
          </div>
        )}

        {order.fulfillmentType === "delivery" &&
          order.status === "onTheWay" &&
          (() => {
            const courier = readCourierForOrder(order.id);
            if (!courier) return null;
            return (
              <div className="flex items-start gap-3">
                <Bike className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {t("entrega.courierTitle")}
                  </dt>
                  <dd className="mt-0.5">
                    {courier.name} · {t(`entrega.veh.${courier.vehicle}`)}
                  </dd>
                  <dd className="mt-0.5">
                    <a
                      href={`tel:${courier.phone.replace(/\s/g, "")}`}
                      className="inline-flex items-center gap-1.5 text-primary hover:underline"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {courier.phone}
                    </a>
                  </dd>
                </div>
              </div>
            );
          })()}

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

        <div className="flex items-start gap-3">
          <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {t("entrega.paymentRequired")}
            </dt>
            {order.paymentMethod ? (
              <>
                <dd className="mt-0.5 font-semibold text-foreground">
                  {requiredPayment?.label ?? order.paymentMethod}
                </dd>
                {payDestination ? (
                  <dd className="mt-1 rounded-lg bg-surface px-2.5 py-1.5 text-xs">
                    <span className="font-bold uppercase tracking-wide text-muted-foreground">
                      {t("entrega.payToLabel")}
                    </span>
                    <span className="mt-0.5 block whitespace-pre-wrap break-words font-medium text-foreground">
                      {payDestination}
                    </span>
                  </dd>
                ) : (
                  requiredPayment?.digital && (
                    <dd className="mt-0.5 text-xs text-muted-foreground">
                      {t("entrega.digitalPaymentHint")}
                    </dd>
                  )
                )}
              </>
            ) : (
              <dd className="mt-0.5 text-muted-foreground">{t("entrega.paymentPending")}</dd>
            )}
          </div>
        </div>

        {order.cautionRequired ? (
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
            <div className="min-w-0">
              <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {t("entrega.cautionRequired")}
              </dt>
              <dd className="mt-0.5 font-semibold text-foreground">
                {formatKz(order.cautionRequired)}
              </dd>
            </div>
          </div>
        ) : null}

        {order.note && (
          <div className="flex items-start gap-3">
            <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {t("entrega.observationLabel")}
              </dt>
              <dd className="mt-0.5">{order.note}</dd>
            </div>
          </div>
        )}
      </dl>

      {/* Carregar comprovativo — depois de o restaurante fixar um método digital */}
      {(paymentDue || order.paymentProof) && (
        <div className="mt-5 rounded-xl border border-border p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {t("entrega.proofTitle")}
          </p>
          {order.paymentProof ? (
            <div className="mt-2 space-y-2">
              <img
                src={order.paymentProof}
                alt=""
                className="max-h-56 w-full rounded-lg border border-border object-contain"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-success">{t("entrega.proofSent")}</span>
                {paymentDue && (
                  <button
                    type="button"
                    onClick={() => setPaymentProof(order.id, null)}
                    className="text-xs font-semibold text-muted-foreground transition-colors hover:text-destructive"
                  >
                    {t("entrega.proofReplace")}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <p className="mt-1 text-xs text-muted-foreground">{t("entrega.proofHint")}</p>
              <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-primary/50 px-4 py-3 text-xs font-bold text-primary transition-colors hover:bg-primary/5">
                <Upload className="h-4 w-4" />
                {proofUploading ? t("entrega.proofUploading") : t("entrega.proofUpload")}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={proofUploading}
                  onChange={onProofFile}
                />
              </label>
            </>
          )}
        </div>
      )}

      <div className="mt-5 border-t border-border pt-4">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {t("entrega.products")}
        </p>
        <ul className="mt-2 space-y-2">
          {order.lines.map((line) => {
            const item = getMenuItem(line.menuItemId);
            if (!item) return null;
            const custom = lineCustomizations(
              line,
              t("entrega.customRemoved"),
              t("entrega.customAdded"),
            );
            return (
              <li key={line.key} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 text-sm">
                <span className="min-w-0">
                  <span className="block truncate text-muted-foreground">
                    {line.qty}× {item.name}
                  </span>
                  {custom.length > 0 && (
                    <span className="block truncate text-xs text-muted-foreground/80">
                      {custom.join(" · ")}
                    </span>
                  )}
                </span>
                <span className="shrink-0 font-semibold">
                  {formatKz(lineUnitPrice(line) * line.qty)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {(order.promoCode || isDelivery) && (
        <div className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>{t("entrega.subtotal")}</span>
            <span>{formatKz(subtotal)}</span>
          </div>
          {order.promoCode && (
            <div className="flex items-center justify-between text-success">
              <span>
                {t("entrega.promoLine", { code: order.promoCode })}
                {order.promoLabel ? ` · ${order.promoLabel}` : ""}
              </span>
              <span>
                {orderDiscount(order) > 0
                  ? `− ${formatKz(orderDiscount(order))}`
                  : t("entrega.promoFreeDelivery")}
              </span>
            </div>
          )}
          {isDelivery && (
            <div className="flex items-center justify-between text-muted-foreground">
              <span>
                {t("entrega.deliveryFeeLine")}
                {surchargeKm > 0 && (
                  <span className="ml-1 text-[11px]">
                    {t("entrega.deliverySurchargeNote", {
                      radius: deliveryPolicy.freeRadiusKm,
                      extraKm: surchargeKm,
                    })}
                  </span>
                )}
              </span>
              <span>{deliveryFee > 0 ? formatKz(deliveryFee) : t("entrega.deliveryFree")}</span>
            </div>
          )}
        </div>
      )}

      <div
        className={`mt-4 flex items-center justify-between border-t border-border pt-4 text-base ${
          order.promoCode || isDelivery ? "border-t-0 pt-1" : ""
        }`}
      >
        <span className="font-bold">{t("entrega.amount")}</span>
        <span className="font-extrabold text-primary">{formatKz(orderTotal(order))}</span>
      </div>

      {canReview && (
        <button
          type="button"
          onClick={() => setReviewOpen(true)}
          className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-primary py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
        >
          <Star className="h-4 w-4" /> {t("entrega.rate")}
        </button>
      )}
      {restaurant && (
        <ReviewDialog
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          restaurantId={order.restaurantId}
          restaurantName={restaurant.name}
          sourceRef={reviewRef}
        />
      )}

      {canCancel ? (
        <button
          type="button"
          onClick={() => {
            cancelOrder(order.id);
            toast.success(t("entrega.canceledToast"));
          }}
          className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {t("entrega.cancelOrder")}
        </button>
      ) : order.status !== "delivered" &&
        order.status !== "completed" &&
        order.status !== "rejected" &&
        order.status !== "canceled" ? (
        <p className="mt-5 rounded-xl border border-dashed border-border py-2.5 text-center text-xs text-muted-foreground">
          {t("entrega.cannotCancel")}
        </p>
      ) : null}
    </>
  );
}
