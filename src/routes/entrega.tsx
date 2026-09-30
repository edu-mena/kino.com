import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bike,
  ChevronLeft,
  ChevronRight,
  FileText,
  MapPin,
  MessageSquare,
  Package,
  Phone,
  Receipt,
  ShieldCheck,
  ShoppingBag,
  Star,
  Trash2,
  Upload,
  Utensils,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import icon from "@/assets/icon.png";
import {
  DetailAction,
  DetailChip,
  DetailContactButtons,
  DetailHeader,
  DetailFacts,
  DetailNote,
  DetailProductList,
  DetailProductRow,
  DetailProgress,
  DetailRow,
  DetailSection,
  DetailTotal,
  StatusBadge,
  orderProgressSteps,
  orderStatusVisual,
  type BreakdownLine,
} from "@/components/detail-card";
import { ClientListFilters, FilteredEmpty, RecencyHeading } from "@/components/list-recency";
import { MediaLightbox } from "@/components/media-lightbox";
import { ReviewDialog } from "@/components/review-dialog";
import { PageHeading, PageShell } from "@/components/site-shell";
import { getRestaurant } from "@/data/helpers";
import { isRefReviewed } from "@/data/reviews-store";
import { useRestaurantDetail, useRestaurantMenuItems } from "@/data/use-restaurants-query";
import type { FulfillmentType } from "@/data/types";
import { hasRealBackend } from "@/lib/api-client";
import { useAuth } from "@/lib/auth";
import { lineCustomizations, lineName, lineUnitPrice, useCart, type CartOrder } from "@/lib/cart";
import { readCourierForOrder } from "@/lib/couriers";
import { viewerKey } from "@/lib/customer";
import { orderDistanceKm } from "@/lib/delivery-eval";
import { formatKz } from "@/lib/format";
import { fileToDocumentDataUrl, isPdfDataUrl } from "@/lib/image-upload";
import { orderShortId, orderStatusLabel } from "@/lib/order-status";
import { getPaymentMethod } from "@/lib/mock-data";
import {
  EMPTY_CLIENT_LIST_FILTER,
  matchesClientListFilter,
  type ClientListFilter,
} from "@/lib/list-filter";
import { groupByRecency, modifiedAt } from "@/lib/recency-groups";
import { useDeliveryPolicy } from "@/lib/use-platform-settings";
import { useMarkKindReadOnView } from "@/lib/notifications";
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

function etaDate(order: CartOrder) {
  const eta =
    order.fulfillmentType === "takeaway" && !order.pickupAsap && order.pickupAt
      ? new Date(order.pickupAt)
      : new Date(new Date(order.createdAt).getTime() + order.estimatedMinutes * 60_000);
  return eta.toLocaleDateString("pt-AO", { day: "2-digit", month: "short", year: "numeric" });
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
  // Ver a lista conta como visto: o badge deste separador desce.
  useMarkKindReadOnView("client", "order");

  // Filtros (restaurante + data) e separadores por data de modificação — a
  // lista vai da modificação mais recente para a mais antiga.
  const [filter, setFilter] = useState<ClientListFilter>(EMPTY_CLIENT_LIST_FILTER);
  const orderRestaurantName = (o: CartOrder) =>
    o.restaurantName || getRestaurant(o.restaurantId)?.name || "Restaurante";
  const filterRestaurants = useMemo(() => {
    const byId = new Map<string, string>();
    for (const o of orders)
      if (!byId.has(o.restaurantId)) byId.set(o.restaurantId, orderRestaurantName(o));
    return [...byId]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [orders]);
  const groups = useMemo(() => {
    const rows = orders
      .map((o) => ({ o, at: modifiedAt(o) }))
      .filter(({ o, at }) => matchesClientListFilter(filter, o.restaurantId, at))
      .sort((a, b) => b.at.getTime() - a.at.getTime());
    return groupByRecency(rows, (r) => r.at);
  }, [orders, filter]);

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
              <div className="space-y-4">
                <ClientListFilters
                  restaurants={filterRestaurants}
                  value={filter}
                  onChange={setFilter}
                />
                {groups.length === 0 && (
                  <FilteredEmpty onClear={() => setFilter(EMPTY_CLIENT_LIST_FILTER)} />
                )}
                {groups.map((group) => (
                  <section key={group.bucket}>
                    <RecencyHeading bucket={group.bucket} className="mb-2 px-1" />
                    <div className="card-soft divide-y divide-border">
                      {group.items.map(({ o: order }) => {
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
                                {orderRestaurantName(order)}
                              </span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {t(`fulfillment.${order.fulfillmentType}`)} · {itemCount}{" "}
                                {itemCount === 1
                                  ? t("entrega.itemSingular")
                                  : t("entrega.itemPlural")}{" "}
                                · {orderStatusLabel(order.status, t)}
                              </span>
                            </span>
                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
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
  // Fotos/descrições dos pratos (a linha do pedido só guarda nome e preço).
  const { data: menuItems } = useRestaurantMenuItems(order.restaurantId);
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

  // Hierarquia do card (do mais para o menos importante): em que ponto está
  // → tenho de fazer alguma coisa? → factos → o que pedi → quanto custa →
  // documentos → ações finais. O secundário (detalhe do valor, documentos já
  // tratados) fica recolhido.
  const menuById = new Map((menuItems ?? []).map((m) => [m.id, m]));
  const progress = orderProgressSteps({
    status: order.status,
    flow: isDelivery ? "delivery" : "pickup",
    labels: [
      t("detailCard.stepSent"),
      t("detailCard.stepPreparing"),
      isDelivery ? t("detailCard.stepOnTheWay") : t("detailCard.stepReady"),
      isDelivery ? t("detailCard.stepDelivered") : t("detailCard.stepCompleted"),
    ],
    captions: [
      hhmm(new Date(order.createdAt)),
      undefined,
      undefined,
      order.deliveredAt ? hhmm(new Date(order.deliveredAt)) : `~${etaTime(order)}`,
    ],
    currentCaption: t("detailCard.now"),
  });
  const itemCount = order.lines.reduce((sum, l) => sum + l.qty, 0);
  const needsProof = paymentDue && !order.paymentProof;
  const breakdown: BreakdownLine[] = [
    { label: t("entrega.subtotal"), value: formatKz(subtotal) },
    ...(order.reservationCredit
      ? [
          {
            label: t("entrega.reservationCreditLine"),
            value: `− ${formatKz(order.reservationCredit)}`,
            tone: "credit" as const,
          },
        ]
      : []),
    ...(order.promoCode
      ? [
          {
            label: `${t("entrega.promoLine", { code: order.promoCode })}${order.promoLabel ? ` · ${order.promoLabel}` : ""}`,
            value:
              orderDiscount(order) > 0
                ? `− ${formatKz(orderDiscount(order))}`
                : t("entrega.promoFreeDelivery"),
            tone: "credit" as const,
          },
        ]
      : []),
    ...(isDelivery
      ? [
          {
            label: (
              <>
                {t("entrega.deliveryFeeLine")}
                {surchargeKm > 0 && (
                  <span className="ml-1 text-[11px]">
                    {t("entrega.deliverySurchargeNote", {
                      radius: deliveryPolicy.freeRadiusKm,
                      extraKm: surchargeKm,
                    })}
                  </span>
                )}
              </>
            ),
            value: deliveryFee > 0 ? formatKz(deliveryFee) : t("entrega.deliveryFree"),
          },
        ]
      : []),
  ];
  const active = order.status !== "delivered" && order.status !== "completed";
  const finishedOrClosed = !active || order.status === "rejected" || order.status === "canceled";

  return (
    <>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary lg:hidden"
      >
        <ChevronLeft className="h-4 w-4" /> {t("common.back")}
      </button>

      {/* 1 · Quem e em que estado */}
      <DetailHeader
        image={restaurant?.coverImage}
        eyebrow={t("detailCard.restaurant")}
        title={restaurant?.name ?? order.restaurantName ?? "Restaurante"}
        subtitle={restaurant?.neighborhood}
        subtitleIcon={MapPin}
        meta={
          <DetailChip icon={Receipt}>
            {t("detailCard.orderRef", { ref: orderShortId(order.id) })} · {etaDate(order)}
          </DetailChip>
        }
        status={
          progress ? undefined : (
            <StatusBadge visual={orderStatusVisual(order.status)}>
              {orderStatusLabel(order.status, t)}
            </StatusBadge>
          )
        }
        extra={
          restaurant && !finishedOrClosed ? (
            <DetailContactButtons
              phone={restaurant.phone}
              callLabel={t("detailCard.call")}
              whatsappLabel={t("detailCard.whatsapp")}
            />
          ) : undefined
        }
      />

      {/* 2 · Em que ponto está */}
      {progress ? (
        <DetailProgress steps={progress} label={t("detailCard.progressAria")} />
      ) : (
        <DetailNote tone={order.status === "rejected" ? "danger" : "neutral"}>
          {order.status === "rejected"
            ? t("detailCard.rejectedTitle")
            : t("detailCard.canceledTitle")}
        </DetailNote>
      )}

      {/* 3 · O que o cliente tem de fazer agora — pagar e enviar o comprovativo */}
      {needsProof && (
        <DetailSection
          tone="warning"
          icon={Wallet}
          title={t("detailCard.payTitle")}
          description={t("detailCard.payBody", {
            method: requiredPayment?.label ?? order.paymentMethod ?? "",
          })}
        >
          {payDestination && (
            <div className="rounded-xl bg-card px-3 py-2.5 text-xs ring-1 ring-inset ring-border/60">
              <span className="font-bold uppercase tracking-wide text-muted-foreground">
                {t("entrega.payToLabel")}
              </span>
              <span className="mt-0.5 block whitespace-pre-wrap break-words text-sm font-semibold text-foreground">
                {payDestination}
              </span>
            </div>
          )}
          <label className="mt-2.5 flex cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90">
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
        </DetailSection>
      )}

      {/* 4 · Factos */}
      <DetailFacts>
        <DetailRow
          icon={MODE_ICON[order.fulfillmentType]}
          label={t("entrega.modeLabel")}
          hint={
            order.fulfillmentType === "dinein" && order.partySize
              ? t("entrega.partySize", { count: order.partySize })
              : order.fulfillmentType === "takeaway"
                ? order.pickupAsap || !order.pickupAt
                  ? t("entrega.pickupAsap")
                  : `${t("entrega.pickupTime")}: ${etaTime(order)}`
                : undefined
          }
        >
          {t(`fulfillment.${order.fulfillmentType}`)}
        </DetailRow>

        <DetailRow
          icon={Wallet}
          label={t("entrega.paymentRequired")}
          hint={
            order.paymentMethod
              ? requiredPayment?.digital && !needsProof && !order.paymentProof
                ? t("entrega.digitalPaymentHint")
                : undefined
              : t("entrega.paymentPending")
          }
        >
          {order.paymentMethod ? (requiredPayment?.label ?? order.paymentMethod) : "—"}
        </DetailRow>

        {order.deliveryAddress && (
          <DetailRow icon={MapPin} label={t("entrega.deliverTo")} span>
            {order.deliveryAddress.label} — {order.deliveryAddress.line1}
          </DetailRow>
        )}

        {courier && (
          <DetailRow icon={Bike} label={t("entrega.courierTitle")} span>
            {courier.name} · {t(`entrega.veh.${courier.vehicle}`)}
            <a
              href={`tel:${courier.phone.replace(/\s/g, "")}`}
              className="mt-0.5 flex items-center gap-1.5 font-normal text-primary hover:underline"
            >
              <Phone className="h-3.5 w-3.5 shrink-0" />
              {courier.phone}
            </a>
          </DetailRow>
        )}

        {order.cautionRequired ? (
          <DetailRow icon={ShieldCheck} label={t("entrega.cautionRequired")}>
            {formatKz(order.cautionRequired)}
          </DetailRow>
        ) : null}

        {order.note && (
          <DetailRow icon={MessageSquare} label={t("entrega.observationLabel")} span>
            {order.note}
          </DetailRow>
        )}
      </DetailFacts>

      {/* 5 · O que foi pedido */}
      <DetailSection
        icon={ShoppingBag}
        title={t("detailCard.products")}
        action={<DetailChip>{t("detailCard.itemsCount", { count: itemCount })}</DetailChip>}
      >
        <DetailProductList>
          {order.lines.map((line) => {
            const name = lineName(line);
            if (!name) return null;
            const item = menuById.get(line.menuItemId);
            const custom = lineCustomizations(
              line,
              t("entrega.customRemoved"),
              t("entrega.customAdded"),
            );
            return (
              <DetailProductRow
                key={line.key}
                image={item?.image}
                name={name}
                description={item?.description}
                price={formatKz(lineUnitPrice(line) * line.qty)}
                quantity={`${line.qty}x`}
              >
                {custom.map((c) => (
                  <DetailChip key={c}>{c}</DetailChip>
                ))}
              </DetailProductRow>
            );
          })}
        </DetailProductList>
      </DetailSection>

      {/* 6 · Quanto custa — o detalhe fica recolhido */}
      <DetailTotal
        label={t("entrega.amount")}
        value={formatKz(orderTotal(order))}
        breakdown={breakdown.length > 1 ? breakdown : undefined}
        showBreakdownLabel={t("detailCard.showBreakdown")}
        hideBreakdownLabel={t("detailCard.hideBreakdown")}
      />

      {/* 7 · Documentos já existentes — recolhidos */}
      {order.paymentProof && (
        <DetailSection
          collapsible
          icon={Upload}
          title={t("entrega.proofTitle")}
          description={t("entrega.proofSent")}
        >
          <div className="space-y-2">
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
            {paymentDue && (
              <button
                type="button"
                onClick={() => setPaymentProof(order.id, null)}
                className="text-xs font-semibold text-muted-foreground transition-colors hover:text-destructive"
              >
                {t("entrega.proofReplace")}
              </button>
            )}
            <MediaLightbox
              open={proofLightboxOpen}
              onOpenChange={setProofLightboxOpen}
              src={order.paymentProof}
              isPdf={proofIsPdf}
              title={t("entrega.proofTitle")}
            />
          </div>
        </DetailSection>
      )}

      {order.invoice && (
        <DetailSection
          collapsible
          icon={Receipt}
          title={t("entrega.invoiceTitle")}
          description={t(
            order.invoiceType === "nif" ? "entrega.invoiceIssuedNif" : "entrega.invoiceIssued",
          )}
        >
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
          <MediaLightbox
            open={invoiceLightboxOpen}
            onOpenChange={setInvoiceLightboxOpen}
            src={order.invoice}
            isPdf={invoiceIsPdf}
            title={t("entrega.invoiceTitle")}
          />
        </DetailSection>
      )}

      {/* 8 · Ações finais */}
      {canReview && (
        <div className="mt-5">
          <DetailAction variant="solid" block icon={Star} onClick={() => setReviewOpen(true)}>
            {t("entrega.rate")}
          </DetailAction>
        </div>
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
          className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-full border border-destructive/40 py-2.5 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/5"
        >
          <Trash2 className="h-4 w-4" />
          {t("entrega.cancelOrder")}
        </button>
      ) : active && order.status !== "rejected" && order.status !== "canceled" ? (
        <p className="mt-5 text-center text-xs text-muted-foreground">
          {t("entrega.cannotCancel")}
        </p>
      ) : null}
    </>
  );
}
