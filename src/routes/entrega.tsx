import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bike,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Package,
  Phone,
  Receipt,
  ShoppingBag,
  Star,
  Trash2,
  Upload,
  Utensils,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import icon from "@/assets/icon.png";
import { MediaLightbox } from "@/components/media-lightbox";
import { ReviewDialog } from "@/components/review-dialog";
import { PageHeading, PageShell } from "@/components/site-shell";
import { getRestaurant } from "@/data/helpers";
import { isRefReviewed } from "@/data/reviews-store";
import { useRestaurantDetail } from "@/data/use-restaurants-query";
import type { FulfillmentType } from "@/data/types";
import { hasRealBackend } from "@/lib/api-client";
import { useAuth } from "@/lib/auth";
import { lineCustomizations, lineName, lineUnitPrice, useCart, type CartOrder } from "@/lib/cart";
import { readCourierForOrder } from "@/lib/couriers";
import { viewerKey } from "@/lib/customer";
import { orderDistanceKm } from "@/lib/delivery-eval";
import { formatKz } from "@/lib/format";
import { fileToDocumentDataUrl, isPdfDataUrl } from "@/lib/image-upload";
import { orderStatusLabel } from "@/lib/order-status";
import { getPaymentMethod } from "@/lib/mock-data";
import { useDeliveryPolicy } from "@/lib/use-platform-settings";
import { useTranslation } from "@/i18n";

/** Um facto do resumo do pedido — label + valor, sem ícone (mesmo desenho
 * compacto já usado no detalhe do painel do restaurante, ver `AdminField`
 * em `admin-stats.tsx`). `span` ocupa as duas colunas da grelha, para
 * valores mais longos (morada, pagamento, nota) não ficarem espremidos. */
function Field({ label, span, children }: { label: string; span?: boolean; children: ReactNode }) {
  return (
    <div className={`min-w-0 ${span ? "col-span-2" : ""}`}>
      <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium text-foreground">{children}</dd>
    </div>
  );
}

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
  // `?pedido=<uuid>` pré-seleciona um pedido — deep-link de notificação (ver
  // notification-list.tsx), mesmo padrão de `?r=` em sistema.subscricoes.tsx.
  validateSearch: (s: Record<string, unknown>): { pedido?: string } => {
    const pedido = s["pedido"];
    return typeof pedido === "string" && pedido ? { pedido } : {};
  },
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

function Entrega() {
  const { pedido: preselect } = Route.useSearch();
  const { orders: allOrders } = useCart();
  const { user } = useAuth();
  // Só os pedidos de quem está a ver (conta ou convidado) — os da seed, sem
  // `ownerKey`, servem os painéis do restaurante, não esta página.
  const mineKey = viewerKey(user);
  const orders = useMemo(
    () => allOrders.filter((o) => o.ownerKey === mineKey),
    [allOrders, mineKey],
  );
  // `activeId` (uuid), não a posição na lista — a posição muda conforme
  // filtro/ordenação e não sobrevive a um deep-link (ver Fase N2).
  const [activeId, setActiveId] = useState<string | null>(preselect ?? null);
  useEffect(() => {
    if (preselect) setActiveId(preselect);
  }, [preselect]);
  const active = orders.find((o) => o.id === activeId) ?? null;
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
          <div className={`min-w-0 ${activeId !== null ? "hidden lg:block" : "block"}`}>
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
                {orders.map((order) => {
                  const restaurant = getRestaurant(order.restaurantId);
                  const itemCount = order.lines.reduce((sum, l) => sum + l.qty, 0);
                  const ModeIcon = MODE_ICON[order.fulfillmentType];
                  return (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => setActiveId(order.id)}
                      className={`group grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4 text-left transition-colors hover:bg-surface ${
                        activeId === order.id ? "bg-surface" : ""
                      }`}
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                        <ModeIcon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold">
                          {order.restaurantName || restaurant?.name || "Restaurante"}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {t(`fulfillment.${order.fulfillmentType}`)} · {itemCount}{" "}
                          {itemCount === 1 ? t("entrega.itemSingular") : t("entrega.itemPlural")} ·{" "}
                          {orderStatusLabel(order.status, t)}
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
          <div className={`min-w-0 ${activeId !== null ? "block" : "hidden lg:block"}`}>
            <div className="card-soft sticky top-24 p-6">
              {active ? (
                <OrderViewer order={active} onBack={() => setActiveId(null)} />
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
  const { data: restaurant } = useRestaurantDetail(order.restaurantId);
  const { t } = useTranslation();
  const [proofUploading, setProofUploading] = useState(false);
  const canCancel = order.status === "pending";
  const isDelivery = order.fulfillmentType === "delivery";
  const subtotal = order.subtotal ?? order.lines.reduce((s, l) => s + lineUnitPrice(l) * l.qty, 0);
  const deliveryFee = isDelivery ? orderTotal(order) - subtotal + orderDiscount(order) : 0;
  const surchargeKm = isDelivery
    ? Math.max(0, Math.ceil(orderDistanceKm(order) - deliveryPolicy.freeRadiusKm))
    : 0;
  const [reviewOpen, setReviewOpen] = useState(false);
  const reviewRef = `order:${order.id}`;
  const canReview =
    (order.status === "delivered" || order.status === "completed") && !isRefReviewed(reviewRef);
  const requiredPayment = getPaymentMethod(order.paymentMethod);
  // Com backend real, `restaurant.paymentDetails` está sempre vazio para o
  // cliente (esse endpoint é staff-only) — o servidor já manda o detalhe
  // certo diretamente no pedido (`order.paymentDestination`, só o método já
  // exigido, nunca a lista completa). Sem backend real, o mock continua a
  // ter tudo no próprio `Restaurant`, como sempre.
  const payDestination =
    order.paymentMethod && requiredPayment?.digital
      ? hasRealBackend
        ? order.paymentDestination?.trim()
        : restaurant?.paymentDetails?.[order.paymentMethod]?.trim()
      : undefined;
  // O pagamento é devido depois de o restaurante aceitar e fixar um método
  // digital, e enquanto o pedido não terminou/foi recusado.
  const paymentDue =
    !!requiredPayment?.digital &&
    order.status !== "pending" &&
    order.status !== "rejected" &&
    order.status !== "canceled";
  const courier =
    order.fulfillmentType === "delivery" && order.status === "onTheWay"
      ? hasRealBackend
        ? (order.courier ?? null)
        : readCourierForOrder(order.id)
      : null;
  const [proofLightboxOpen, setProofLightboxOpen] = useState(false);
  const proofIsPdf = isPdfDataUrl(order.paymentProof);
  const [invoiceLightboxOpen, setInvoiceLightboxOpen] = useState(false);
  const invoiceIsPdf = isPdfDataUrl(order.invoice);

  const onProofFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setProofUploading(true);
    try {
      const dataUrl = await fileToDocumentDataUrl(file);
      const ok = await setPaymentProof(order.id, dataUrl);
      if (!ok) throw new Error(t("entrega.proofError"));
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

      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
        <Field label={t("entrega.deliveryStatus")}>
          {t(`fulfillment.${order.fulfillmentType}`)} · {orderStatusLabel(order.status, t)}
        </Field>

        <Field
          label={order.fulfillmentType === "takeaway" ? t("entrega.pickupTime") : t("entrega.eta")}
        >
          {order.fulfillmentType === "takeaway" && order.pickupAsap
            ? t("entrega.pickupAsap")
            : `~${etaTime(order)}`}
        </Field>

        {order.deliveryAddress && (
          <Field label={t("entrega.deliverTo")} span>
            {order.deliveryAddress.label} — {order.deliveryAddress.line1}
          </Field>
        )}

        {order.fulfillmentType === "takeaway" && restaurant && (
          <Field label={t("entrega.modeLabel")} span>
            {t("entrega.pickupHere", { name: restaurant.name })}
          </Field>
        )}

        {order.fulfillmentType === "dinein" && (
          <Field label={t("entrega.dineInHere")}>
            {order.partySize ? t("entrega.partySize", { count: order.partySize }) : "—"}
          </Field>
        )}

        {courier && (
          <Field label={t("entrega.courierTitle")} span>
            {courier.name} · {t(`entrega.veh.${courier.vehicle}`)}
            <a
              href={`tel:${courier.phone.replace(/\s/g, "")}`}
              className="mt-0.5 flex items-center gap-1.5 font-normal text-primary hover:underline"
            >
              <Phone className="h-3.5 w-3.5 shrink-0" />
              {courier.phone}
            </a>
          </Field>
        )}

        {restaurant && (
          <Field label={t("entrega.complaintContact")}>
            <a href={`tel:${restaurant.phone.replace(/\s/g, "")}`} className="hover:underline">
              {restaurant.phone}
            </a>
          </Field>
        )}

        <Field label={t("entrega.paymentRequired")} span>
          {order.paymentMethod ? (
            <>
              <span className="block font-semibold">
                {requiredPayment?.label ?? order.paymentMethod}
              </span>
              {payDestination ? (
                <span className="mt-1 block rounded-lg bg-surface px-2.5 py-1.5 text-xs font-normal">
                  <span className="font-bold uppercase tracking-wide text-muted-foreground">
                    {t("entrega.payToLabel")}
                  </span>
                  <span className="mt-0.5 block whitespace-pre-wrap break-words font-medium text-foreground">
                    {payDestination}
                  </span>
                </span>
              ) : (
                requiredPayment?.digital && (
                  <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                    {t("entrega.digitalPaymentHint")}
                  </span>
                )
              )}
            </>
          ) : (
            <span className="font-normal text-muted-foreground">{t("entrega.paymentPending")}</span>
          )}
        </Field>

        {order.cautionRequired ? (
          <Field label={t("entrega.cautionRequired")}>{formatKz(order.cautionRequired)}</Field>
        ) : null}

        {order.note && (
          <Field label={t("entrega.observationLabel")} span>
            {order.note}
          </Field>
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
              <button
                type="button"
                onClick={() => setProofLightboxOpen(true)}
                aria-label={t("entrega.proofViewAria")}
                className="block w-full"
              >
                {proofIsPdf ? (
                  <span className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-3 text-left text-sm font-semibold text-foreground transition-colors hover:border-primary">
                    <FileText className="h-5 w-5 shrink-0 text-primary" />
                    {t("entrega.proofPdfLabel")}
                  </span>
                ) : (
                  <img
                    src={order.paymentProof}
                    alt=""
                    className="max-h-56 w-full rounded-lg border border-border object-contain transition-opacity hover:opacity-90"
                  />
                )}
              </button>
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
              <MediaLightbox
                open={proofLightboxOpen}
                onOpenChange={setProofLightboxOpen}
                src={order.paymentProof}
                isPdf={proofIsPdf}
                title={t("entrega.proofTitle")}
              />
            </div>
          ) : (
            <>
              <p className="mt-1 text-xs text-muted-foreground">{t("entrega.proofHint")}</p>
              <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-primary/50 px-4 py-3 text-xs font-bold text-primary transition-colors hover:bg-primary/5">
                <Upload className="h-4 w-4" />
                {proofUploading ? t("entrega.proofUploading") : t("entrega.proofUpload")}
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  disabled={proofUploading}
                  onChange={onProofFile}
                />
              </label>
            </>
          )}
        </div>
      )}

      {/* Fatura emitida pelo restaurante — o cliente só vê, não carrega */}
      {(order.invoice ||
        (order.status !== "pending" &&
          order.status !== "rejected" &&
          order.status !== "canceled")) && (
        <div className="mt-5 rounded-xl border border-border p-4">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <Receipt className="h-3.5 w-3.5" />
            {t("entrega.invoiceTitle")}
          </p>
          {order.invoice ? (
            <div className="mt-2 space-y-1.5">
              <button
                type="button"
                onClick={() => setInvoiceLightboxOpen(true)}
                aria-label={t("entrega.invoiceViewAria")}
                className="block w-full"
              >
                {invoiceIsPdf ? (
                  <span className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-3 text-left text-sm font-semibold text-foreground transition-colors hover:border-primary">
                    <FileText className="h-5 w-5 shrink-0 text-primary" />
                    {t("entrega.invoicePdfLabel")}
                  </span>
                ) : (
                  <img
                    src={order.invoice}
                    alt=""
                    className="max-h-56 w-full rounded-lg border border-border object-contain transition-opacity hover:opacity-90"
                  />
                )}
              </button>
              <p className="text-xs font-semibold text-success">
                {t(
                  order.invoiceType === "nif"
                    ? "entrega.invoiceIssuedNif"
                    : "entrega.invoiceIssued",
                )}
              </p>
              <MediaLightbox
                open={invoiceLightboxOpen}
                onOpenChange={setInvoiceLightboxOpen}
                src={order.invoice}
                isPdf={invoiceIsPdf}
                title={t("entrega.invoiceTitle")}
              />
            </div>
          ) : (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              {t("entrega.invoicePending")}
            </p>
          )}
        </div>
      )}

      <div className="mt-5 border-t border-border pt-4">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {t("entrega.products")}
        </p>
        <ul className="mt-2 space-y-2">
          {order.lines.map((line) => {
            const name = lineName(line);
            if (!name) return null;
            const custom = lineCustomizations(
              line,
              t("entrega.customRemoved"),
              t("entrega.customAdded"),
            );
            return (
              <li key={line.key} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 text-sm">
                <span className="min-w-0">
                  <span className="block truncate text-muted-foreground">
                    {line.qty}× {name}
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

      {(order.promoCode || isDelivery || order.reservationCredit) && (
        <div className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>{t("entrega.subtotal")}</span>
            <span>{formatKz(subtotal)}</span>
          </div>
          {!!order.reservationCredit && (
            <div className="flex items-center justify-between font-semibold text-success">
              <span>{t("entrega.reservationCreditLine")}</span>
              <span>− {formatKz(order.reservationCredit)}</span>
            </div>
          )}
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
          onClick={async () => {
            const ok = await cancelOrder(order.id);
            if (ok) toast.success(t("entrega.canceledToast"));
            else toast.error(t("entrega.cancelErrorToast"));
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
