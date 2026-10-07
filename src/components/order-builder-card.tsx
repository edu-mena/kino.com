import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bike,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Clock,
  LocateFixed,
  MessageSquare,
  Minus,
  Plus,
  Receipt,
  ShieldAlert,
  ShoppingBag,
  Tag,
  Trash2,
  Users,
  Utensils,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { CompanyFormDialog } from "@/components/company-form-dialog";
import { RestaurantRecommendationsDialog } from "@/components/restaurant-recommendations-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { UseCurrentLocationField } from "@/components/use-current-location-field";
import {
  addressProvince,
  canDeliverToNeighborhood,
  getRestaurantFulfillmentModes,
  orderModeRequiresCaution,
} from "@/data/helpers";
import { discountableSubtotal, resolvePromoCode, type PromoEffect } from "@/data/offers-store";
import { computeDeliveryFee } from "@/data/platform-settings-store";
import { useOffers } from "@/data/use-offers";
import { useRestaurantDetail, useRestaurantMenuItems } from "@/data/use-restaurants-query";
import type { FulfillmentType } from "@/data/types";
import { useTranslation } from "@/i18n";
import { useAddresses } from "@/lib/addresses";
import { useAuth } from "@/lib/auth";
import { billLineUnitPrice, useBill } from "@/lib/bill";
import { useCart, type OrderFulfillment } from "@/lib/cart";
import { useCompanies } from "@/lib/companies";
import { addressDistanceKm } from "@/lib/delivery-eval";
import { formatKz } from "@/lib/format";
import { useLocation } from "@/lib/location";
import { useReservations } from "@/lib/reservations";
import { useRestaurantStatus } from "@/lib/restaurant-status";
import { useDeliveryPolicy } from "@/lib/use-platform-settings";

/**
 * Card fixo no canto inferior direito — lista temporária de tudo o que foi
 * adicionado via o botão "+" dos pratos, sempre de UM restaurante de cada
 * vez (ver `useAddToBill`). Fica visível em qualquer página enquanto houver
 * itens; começa minimizado (só o cabeçalho com o total).
 *
 * Ao expandir, o cliente escolhe o modo (entrega / levantar / no local,
 * limitado aos que o restaurante oferece) e "Continuar" avança, dentro do
 * mesmo card, para os campos mínimos desse modo. Antes isto era um diálogo
 * à parte por cima — além de ser um passo extra sem necessidade nenhuma
 * (nada aqui precisa do foco/overlay de um diálogo), num ecrã pequeno o seu
 * conteúdo passava facilmente da altura do ecrã sem maneira de chegar ao
 * botão de enviar. Um segundo "passo" dentro do próprio card (com scroll
 * próprio, ver `max-h` abaixo) resolve os dois problemas de uma vez. O
 * pedido sai como "pending"; o restaurante é que fixa depois o método de
 * pagamento exigido ao aceitar.
 */

const MODE_ICON: Record<FulfillmentType, typeof Bike> = {
  delivery: Bike,
  takeaway: ShoppingBag,
  dinein: Utensils,
};

/** "HH:mm" de hoje → ISO; se já passou, rola para amanhã. */
function toPickupIso(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1);
  return d.toISOString();
}

/** Sugestão inicial: daqui a ~30 min, arredondado a :00/:30. */
function defaultPickupTime(): string {
  const d = new Date(Date.now() + 30 * 60_000);
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() < 30 ? 30 : 0);
  if (d.getMinutes() === 0 && new Date().getMinutes() >= 30) d.setHours(d.getHours() + 1);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function OrderBuilderCard({ aboveTabBar = false }: { aboveTabBar?: boolean } = {}) {
  const { t } = useTranslation();
  // No mobile a `MobileTabBar` (fixa, ~4.5rem + safe-area) ocupa o fundo do
  // ecrã — o cartão sobe acima dela para não tapar os separadores. Do `md`
  // para cima não há tabbar, fica na posição de sempre.
  const positionClass = aboveTabBar
    ? "bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-[calc(1rem+env(safe-area-inset-bottom))]"
    : "bottom-[calc(1rem+env(safe-area-inset-bottom))]";
  const { restaurantId, lines, updateQty, discard } = useBill();
  const { addOrder } = useCart();
  const { user } = useAuth();
  const { companies } = useCompanies();
  const { reservations } = useReservations();
  const status = useRestaurantStatus(restaurantId ?? "");
  // Real-aware (`useRestaurantDetail`/`useRestaurantMenuItems`) em vez do
  // `getRestaurant`/`getMenuItem` síncronos de `@/data/helpers` — esses só
  // conhecem o mock local e devolviam sempre `undefined` para um restaurante
  // real, escondendo este cartão inteiro em silêncio (`return null` abaixo).
  const restaurantQuery = useRestaurantDetail(restaurantId ?? undefined);
  const menuItemsQuery = useRestaurantMenuItems(restaurantId ?? undefined);
  const { allAddresses, selected: headerLocation } = useLocation();
  const { addAddress } = useAddresses();
  const deliveryPolicy = useDeliveryPolicy();
  const navigate = useNavigate();

  const [expanded, setExpanded] = useState(false);
  const [recommendationsOpen, setRecommendationsOpen] = useState(false);
  const [step, setStep] = useState<"list" | "confirm">("list");
  const [modeOverride, setModeOverride] = useState<FulfillmentType | null>(null);
  const [chosenAddressId, setChosenAddressId] = useState<string | null>(null);
  const [useLocationOpen, setUseLocationOpen] = useState(false);
  const [note, setNote] = useState("");
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<PromoEffect | null>(null);
  const offers = useOffers();
  const [promoError, setPromoError] = useState(false);
  const [pickupChoice, setPickupChoice] = useState<"asap" | "scheduled">("asap");
  const [pickupTime, setPickupTime] = useState(defaultPickupTime);
  const [partySize, setPartySize] = useState(2);
  const [wantsNifInvoice, setWantsNifInvoice] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  // Reserva escolhida para descontar a caução do consumo (passo dine-in) —
  // `undefined` = ainda não mexido pelo cliente, usa o padrão (a única
  // reserva elegível, se só houver uma); `null` = desligado explicitamente.
  const [reservationChoice, setReservationChoice] = useState<string | null | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  // Extras opcionais (nota, código, NIF) — recolhidos, um aberto de cada vez.
  const [openExtra, setOpenExtra] = useState<"note" | "promo" | "invoice" | null>(null);

  // Reservas de hoje, confirmadas e com caução já paga, NESTE restaurante —
  // elegíveis para descontar automaticamente do consumo de um pedido
  // dine-in (ver plano, Fase J3).
  const todayStr = new Date().toISOString().slice(0, 10);
  const eligibleReservations = reservations.filter(
    (r) =>
      r.restaurantId === restaurantId &&
      r.status === "Confirmada" &&
      r.cautionStatus === "Paga" &&
      r.date === todayStr,
  );
  const autoReservationId = eligibleReservations.length === 1 ? eligibleReservations[0]!.id : null;
  const selectedReservationId =
    reservationChoice !== undefined ? reservationChoice : autoReservationId;

  if (!restaurantId || lines.length === 0) return null;

  const restaurant = restaurantQuery.data;
  if (!restaurant) {
    // Nunca esconder o cartão em silêncio enquanto há itens na lista — só
    // `null` quando não há mesmo lista (acima). A carregar ou falhado, o
    // cliente continua a ver que tem algo pendente.
    return (
      <div
        className={`${positionClass} fixed right-4 z-40 w-80 max-w-[calc(100vw-2rem)] rounded-[1.5rem] bg-neutral-900 p-3.5 text-primary-foreground shadow-2xl ring-1 ring-white/10`}
      >
        <span className="flex items-center gap-3 font-display text-sm font-bold">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10">
            <Receipt className="h-4 w-4" />
          </span>
          {restaurantQuery.isError
            ? t("orderBuilderCard.loadError")
            : t("orderBuilderCard.loading")}
        </span>
      </div>
    );
  }

  const menuItemsById = new Map((menuItemsQuery.data ?? []).map((item) => [item.id, item]));

  const paused = !status.available;
  const pausedMessage =
    status.reason === "closed"
      ? t("orderBuilderCard.closedNow", { opensAt: status.opensAt ?? "" })
      : t("orderBuilderCard.restaurantPaused");

  const availableModes = getRestaurantFulfillmentModes(restaurant);
  const mode: FulfillmentType =
    modeOverride && availableModes.includes(modeOverride) ? modeOverride : availableModes[0]!;

  const total = lines.reduce(
    (sum, l) => sum + billLineUnitPrice(l, menuItemsById.get(l.menuItemId)) * l.qty,
    0,
  );
  const cautionForMode = orderModeRequiresCaution(restaurant, mode);
  // Sem alvo (prato/categoria) na promoção, desconta o pedido inteiro (`total`
  // acima) — com alvo, só o subtotal dos itens visados entra no cálculo
  // (mesma regra do backend real, ver OrderPricingService::price).
  const promoDiscount = promo?.percentOff
    ? Math.round(
        discountableSubtotal(
          lines.map((l) => ({
            menuItemId: l.menuItemId,
            category: menuItemsById.get(l.menuItemId)?.category,
            lineTotal: billLineUnitPrice(l, menuItemsById.get(l.menuItemId)) * l.qty,
          })),
          promo,
        ) *
          (promo.percentOff / 100),
      )
    : 0;

  // Estimativa da taxa de entrega para a morada escolhida — taxa única do
  // restaurante + acréscimo por km acima do raio da política da plataforma.
  const chosenAddress = allAddresses.find((a) => a.id === chosenAddressId);
  const deliveryKm =
    mode === "delivery" && chosenAddress ? addressDistanceKm(restaurantId, chosenAddress) : null;
  const deliveryFeeEstimate =
    deliveryKm == null
      ? null
      : promo?.freeDelivery
        ? 0
        : computeDeliveryFee(restaurant.deliveryFee, deliveryKm, deliveryPolicy);
  const deliverySurchargeKm =
    deliveryKm == null ? 0 : Math.max(0, Math.ceil(deliveryKm - deliveryPolicy.freeRadiusKm));

  const resetPromo = () => {
    setPromoInput("");
    setPromo(null);
    setPromoError(false);
  };
  const applyPromo = () => {
    const trimmed = promoInput.trim();
    if (!trimmed) {
      resetPromo();
      return;
    }
    const effect = restaurantId ? resolvePromoCode(restaurantId, trimmed, offers) : null;
    setPromo(effect);
    setPromoError(!effect);
  };

  // Morada dentro da zona de entrega do restaurante (sem província
  // conhecida, não se bloqueia — o servidor valida de novo ao enviar).
  const isInZone = (address: { line2: string }) => {
    const province = addressProvince(address.line2);
    return !province || canDeliverToNeighborhood(restaurant, province);
  };

  const goToConfirm = () => {
    if (paused) {
      toast.error(pausedMessage);
      return;
    }
    // A do topo se estiver na zona; senão a primeira guardada que esteja.
    const preferred = [headerLocation, ...allAddresses].find((a) => a && isInZone(a));
    setChosenAddressId(preferred?.id ?? headerLocation?.id ?? allAddresses[0]?.id ?? null);
    setStep("confirm");
  };

  const submit = async () => {
    if (paused || submitting) {
      if (paused) toast.error(pausedMessage);
      return;
    }

    let fulfillment: OrderFulfillment;
    if (mode === "delivery") {
      const address = allAddresses.find((a) => a.id === chosenAddressId);
      if (!address) {
        toast.error(t("orderBuilderCard.needAddress"));
        return;
      }
      const province = addressProvince(address.line2);
      if (province && !canDeliverToNeighborhood(restaurant, province)) {
        toast.error(t("orderBuilderCard.outOfZone", { province }));
        return;
      }
      fulfillment = { type: "delivery", deliveryAddress: address };
    } else if (mode === "takeaway") {
      fulfillment =
        pickupChoice === "asap"
          ? { type: "takeaway", pickupAsap: true }
          : { type: "takeaway", pickupAsap: false, pickupAt: toPickupIso(pickupTime) };
    } else {
      fulfillment = { type: "dinein", partySize };
    }

    if (wantsNifInvoice && !companyId) {
      toast.error(t("orderBuilderCard.needCompany"));
      return;
    }

    setSubmitting(true);
    const ok = await addOrder(
      restaurantId,
      lines.map((line) => ({
        menuItemId: line.menuItemId,
        qty: line.qty,
        selectedIngredients: line.selectedIngredients,
      })),
      fulfillment,
      note,
      promo,
      wantsNifInvoice ? { wantsNifInvoice: true, ...(companyId ? { companyId } : {}) } : undefined,
      mode === "dinein" && selectedReservationId ? selectedReservationId : undefined,
    );
    setSubmitting(false);
    if (!ok) {
      toast.error(t("orderBuilderCard.orderCreatedError"));
      return;
    }
    discard();
    setStep("list");
    setNote("");
    resetPromo();
    setWantsNifInvoice(false);
    setCompanyId(null);
    setReservationChoice(undefined);
    toast.success(t("orderBuilderCard.orderCreatedToast"));
    navigate({ to: "/entrega" });
  };

  // ---------- Derivados só para a apresentação ----------
  const itemCount = lines.reduce((n, l) => n + l.qty, 0);
  const itemsLabel = `${itemCount} ${
    itemCount === 1 ? t("orderBuilderCard.itemSingular") : t("orderBuilderCard.itemPlural")
  }`;
  const ModeIcon = MODE_ICON[mode];

  // Taxa mostrada no resumo: grátis com a promo; estimada pela distância
  // quando a morada tem coordenadas; senão o mínimo do restaurante.
  const deliveryFeeShown =
    mode !== "delivery"
      ? null
      : promo?.freeDelivery
        ? 0
        : (deliveryFeeEstimate ?? (chosenAddress ? restaurant.deliveryFee : null));
  const reservationCredit =
    mode === "dinein" && selectedReservationId
      ? (eligibleReservations.find((r) => r.id === selectedReservationId)?.cautionAmount ?? 0)
      : 0;
  // Estimativa — o restaurante confirma o valor final ao aceitar.
  const estimatedTotal = Math.max(
    0,
    total - promoDiscount + (deliveryFeeShown ?? 0) - reservationCredit,
  );
  const selectedCompany = companies.find((c) => c.id === companyId);
  const toggleExtra = (extra: "note" | "promo" | "invoice") =>
    setOpenExtra((current) => (current === extra ? null : extra));

  return (
    <div
      className={`${positionClass} fixed right-4 z-40 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-[1.5rem] bg-neutral-900 text-primary-foreground shadow-2xl ring-1 ring-white/10`}
    >
      {/* Cabeçalho — sempre visível: quantos itens, de onde e, fechado, quanto
          (aberto, o valor já está no subtotal/recibo logo abaixo — repeti-lo
          no topo mostrava o mesmo número duas e três vezes). */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-label={
          expanded ? t("orderBuilderCard.collapseAria") : t("orderBuilderCard.expandAria")
        }
        className="flex w-full items-center gap-3 p-3.5 text-left"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-sm font-extrabold tabular-nums text-brand-foreground">
          {itemCount}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-sm font-bold">{restaurant.name}</span>
          <span className="block text-xs text-primary-foreground/55">
            {expanded ? t("orderBuilderCard.hide") : t("orderBuilderCard.viewOrder")}
          </span>
        </span>
        {!expanded && (
          <span className="shrink-0 font-display text-base font-extrabold tabular-nums">
            {formatKz(total)}
          </span>
        )}
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-primary-foreground/60" />
        ) : (
          <ChevronUp className="h-4 w-4 shrink-0 text-primary-foreground/60" />
        )}
      </button>

      {expanded && (
        // `max-h`/`overflow-y-auto`: o passo de confirmação nunca passa da
        // altura do ecrã com o botão de enviar fora de vista (ver o topo).
        <div className="max-h-[min(34rem,64dvh)] overflow-y-auto border-t border-white/10 md:max-h-[min(34rem,72dvh)]">
          {step === "list" ? (
            <div className="px-4 pb-4 pt-1">
              {/* Linhas: nome + preço por baixo; à direita só o contador. */}
              <ul className="max-h-52 divide-y divide-white/10 overflow-y-auto">
                {lines.map((line) => {
                  const item = menuItemsById.get(line.menuItemId);
                  if (!item) return null;
                  const unit = billLineUnitPrice(line, item);
                  return (
                    <li key={line.key} className="flex items-center gap-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{item.name}</p>
                        <p className="text-xs tabular-nums text-primary-foreground/55">
                          {line.qty > 1
                            ? `${line.qty} × ${formatKz(unit)} = ${formatKz(unit * line.qty)}`
                            : formatKz(unit)}
                        </p>
                      </div>
                      <QtyStepper
                        qty={line.qty}
                        onChange={(qty) => updateQty(line.key, qty)}
                        labels={{
                          decrease: t("orderBuilderCard.decrease"),
                          increase: t("orderBuilderCard.increase"),
                          remove: t("orderBuilderCard.remove"),
                        }}
                      />
                    </li>
                  );
                })}
              </ul>

              <div className="mt-1 flex items-baseline justify-between border-t border-white/10 pt-3">
                <span className="text-sm text-primary-foreground/70">
                  {t("orderBuilderCard.subtotal")}
                </span>
                <span className="font-display text-lg font-extrabold tabular-nums">
                  {formatKz(total)}
                </span>
              </div>

              {paused ? (
                <div className="mt-4 rounded-xl bg-white/5 px-3 py-3 text-center text-xs text-primary-foreground/75">
                  <p>{pausedMessage}</p>
                  <button
                    type="button"
                    onClick={() => setRecommendationsOpen(true)}
                    className="mt-1.5 font-bold text-brand hover:underline"
                  >
                    {t("orderBuilderCard.seeAlternatives")}
                  </button>
                </div>
              ) : (
                <>
                  <SegmentedControl
                    ariaLabel={t("orderBuilderCard.chooseMode")}
                    value={mode}
                    onChange={setModeOverride}
                    options={availableModes.map((m) => ({
                      value: m,
                      label: t(`fulfillment.${m}`),
                      icon: MODE_ICON[m],
                    }))}
                    className="mt-4"
                  />
                  <button
                    type="button"
                    onClick={goToConfirm}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-brand-foreground transition-opacity hover:opacity-90"
                  >
                    {t("orderBuilderCard.continue")}
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={discard}
                className="mx-auto mt-2 flex items-center gap-1.5 px-2 py-1.5 text-xs font-semibold text-primary-foreground/50 transition-colors hover:text-primary-foreground"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t("orderBuilderCard.discardList")}
              </button>
            </div>
          ) : (
            <div className="px-4 pb-4 pt-3">
              {/* Barra do passo: voltar · modo · nº de itens. */}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setStep("list")}
                  aria-label={t("orderBuilderCard.backToList")}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 transition-colors hover:bg-white/15"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <p className="flex min-w-0 flex-1 items-center gap-1.5 font-display text-base font-bold">
                  <ModeIcon className="h-4 w-4 shrink-0 text-brand" />
                  <span className="truncate">{t(`fulfillment.${mode}`)}</span>
                </p>
                <span className="shrink-0 text-xs text-primary-foreground/55">{itemsLabel}</span>
              </div>

              {/* ---------- 1. O obrigatório do modo ---------- */}
              <section className="mt-5">
                <SectionLabel>
                  {mode === "delivery"
                    ? t("orderBuilderCard.whereTo")
                    : mode === "takeaway"
                      ? t("orderBuilderCard.whenPickup")
                      : t("orderBuilderCard.partySizeLabel")}
                </SectionLabel>

                {mode === "delivery" && (
                  <>
                    <div className="mt-2 space-y-1">
                      {allAddresses.map((a) => {
                        const inZone = isInZone(a);
                        const selected = chosenAddressId === a.id;
                        return (
                          <button
                            key={a.id}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            disabled={!inZone}
                            onClick={() => setChosenAddressId(a.id)}
                            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                              selected ? "bg-white/10 ring-1 ring-brand" : "hover:bg-white/5"
                            }`}
                          >
                            <RadioDot checked={selected} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold">
                                {a.label}
                              </span>
                              <span className="block truncate text-xs text-primary-foreground/55">
                                {inZone ? a.line1 : t("orderBuilderCard.outOfZoneShort")}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                      {allAddresses.length === 0 && (
                        <p className="rounded-xl bg-white/5 p-3 text-center text-xs text-primary-foreground/60">
                          {t("orderBuilderCard.noSavedAddresses")}
                        </p>
                      )}
                    </div>

                    {useLocationOpen ? (
                      <div className="mt-2">
                        <UseCurrentLocationField
                          onConfirm={({ lat, lng, line1 }) => {
                            const address = addAddress(
                              t("orderBuilderCard.currentLocationLabel"),
                              line1 || t("orderBuilderCard.currentLocationLabel"),
                              undefined,
                              { lat, lng },
                            );
                            setChosenAddressId(address.id);
                            setUseLocationOpen(false);
                          }}
                          onCancel={() => setUseLocationOpen(false)}
                        />
                      </div>
                    ) : (
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 px-1">
                        <button
                          type="button"
                          onClick={() => setUseLocationOpen(true)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                        >
                          <LocateFixed className="h-3.5 w-3.5" />
                          {t("orderBuilderCard.useMyLocation")}
                        </button>
                        <Link
                          to="/perfil"
                          onClick={() => setExpanded(false)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          {t("orderBuilderCard.newAddressShort")}
                        </Link>
                      </div>
                    )}
                  </>
                )}

                {mode === "takeaway" && (
                  <>
                    <SegmentedControl
                      ariaLabel={t("orderBuilderCard.whenPickup")}
                      value={pickupChoice}
                      onChange={setPickupChoice}
                      options={[
                        { value: "asap", label: t("orderBuilderCard.pickupAsap") },
                        { value: "scheduled", label: t("orderBuilderCard.pickupScheduled") },
                      ]}
                      className="mt-2"
                    />
                    {pickupChoice === "scheduled" && (
                      <label className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-white/5 px-3 py-2 text-sm">
                        <span className="flex items-center gap-2 text-primary-foreground/70">
                          <Clock className="h-4 w-4" />
                          {t("orderBuilderCard.pickupTimeLabel")}
                        </span>
                        <input
                          type="time"
                          value={pickupTime}
                          onChange={(e) => setPickupTime(e.target.value)}
                          className="rounded-lg bg-white/10 px-2 py-1 text-sm font-bold tabular-nums text-primary-foreground outline-none focus:ring-1 focus:ring-brand"
                        />
                      </label>
                    )}
                  </>
                )}

                {mode === "dinein" && (
                  <>
                    <div className="mt-2 flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                      <Users className="h-4 w-4 text-primary-foreground/60" aria-hidden />
                      <QtyStepper
                        qty={partySize}
                        min={1}
                        max={20}
                        onChange={setPartySize}
                        labels={{
                          decrease: t("orderBuilderCard.decrease"),
                          increase: t("orderBuilderCard.increase"),
                          remove: t("orderBuilderCard.decrease"),
                        }}
                      />
                    </div>

                    {/* Caução já paga de uma reserva de hoje desconta do
                        consumo — ver plano, Fase J3. */}
                    {eligibleReservations.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        <label className="flex items-center gap-2.5 px-1 text-xs font-semibold">
                          <Checkbox
                            checked={selectedReservationId !== null}
                            onCheckedChange={(checked) => {
                              setReservationChoice(
                                checked === true
                                  ? (autoReservationId ?? eligibleReservations[0]!.id)
                                  : null,
                              );
                            }}
                            className="border-primary-foreground/40 data-[state=checked]:bg-brand data-[state=checked]:text-brand-foreground"
                          />
                          {eligibleReservations.length === 1
                            ? t("orderBuilderCard.useReservationCredit", {
                                amount: formatKz(eligibleReservations[0]!.cautionAmount),
                              })
                            : t("orderBuilderCard.useReservationCreditGeneric")}
                        </label>
                        {selectedReservationId !== null && eligibleReservations.length > 1 && (
                          <div className="space-y-1 pl-7">
                            {eligibleReservations.map((r) => (
                              <button
                                key={r.id}
                                type="button"
                                role="radio"
                                aria-checked={selectedReservationId === r.id}
                                onClick={() => setReservationChoice(r.id)}
                                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs ${
                                  selectedReservationId === r.id
                                    ? "bg-white/10 ring-1 ring-brand"
                                    : "hover:bg-white/5"
                                }`}
                              >
                                <RadioDot checked={selectedReservationId === r.id} />
                                <span className="flex-1">{r.time}</span>
                                <span className="font-bold tabular-nums">
                                  {formatKz(r.cautionAmount)}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </section>

              {/* Caução exigida pelo restaurante neste modo — uma linha, a
                  política por baixo, sem caixa colorida a competir. */}
              {cautionForMode && (
                <div className="mt-4 flex gap-2.5 rounded-xl bg-white/5 p-3 text-xs">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {t("orderBuilderCard.cautionShort", {
                        amount: formatKz(restaurant.cautionAmount),
                      })}
                    </p>
                    {restaurant.cautionPolicyNotice && (
                      <p className="mt-0.5 text-primary-foreground/55">
                        {restaurant.cautionPolicyNotice}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* ---------- 2. Opcional — recolhido, mostra o valor quando há ---------- */}
              <section className="mt-5">
                <SectionLabel>{t("orderBuilderCard.extrasTitle")}</SectionLabel>
                <div className="mt-2 divide-y divide-white/10 overflow-hidden rounded-xl bg-white/5">
                  <ExtraRow
                    icon={MessageSquare}
                    label={t("orderBuilderCard.extraNote")}
                    value={note.trim() || null}
                    open={openExtra === "note"}
                    onToggle={() => toggleExtra("note")}
                  >
                    <textarea
                      id="order-note"
                      aria-label={t("orderBuilderCard.extraNote")}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder={t("orderBuilderCard.notePlaceholder")}
                      rows={2}
                      className="w-full rounded-lg bg-white/10 px-3 py-2 text-sm text-primary-foreground outline-none placeholder:text-primary-foreground/40 focus:ring-1 focus:ring-brand"
                    />
                  </ExtraRow>

                  <ExtraRow
                    icon={Tag}
                    label={t("orderBuilderCard.promoLabel")}
                    value={promo ? promo.label : null}
                    valueTone="success"
                    open={openExtra === "promo"}
                    onToggle={() => toggleExtra("promo")}
                  >
                    <div className="flex gap-2">
                      <input
                        id="order-promo"
                        aria-label={t("orderBuilderCard.promoLabel")}
                        value={promoInput}
                        onChange={(e) => {
                          setPromoInput(e.target.value.toUpperCase());
                          setPromoError(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            applyPromo();
                          }
                        }}
                        placeholder={t("orderBuilderCard.promoPlaceholder")}
                        className={`min-w-0 flex-1 rounded-lg bg-white/10 px-3 py-2 text-sm uppercase text-primary-foreground outline-none placeholder:text-primary-foreground/40 focus:ring-1 ${
                          promoError ? "ring-1 ring-destructive" : "focus:ring-brand"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={promo ? resetPromo : applyPromo}
                        className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                          promo
                            ? "text-primary-foreground/70 hover:text-destructive"
                            : "bg-primary-foreground text-neutral-900 hover:opacity-90"
                        }`}
                      >
                        {promo
                          ? t("orderBuilderCard.promoRemove")
                          : t("orderBuilderCard.promoApply")}
                      </button>
                    </div>
                    {promoError && (
                      <p className="mt-1.5 text-xs text-destructive">
                        {t("orderBuilderCard.promoInvalid")}
                      </p>
                    )}
                  </ExtraRow>

                  {/* Fatura com NIF — exige conta (empresas são só do
                      cliente autenticado, ver CompanyController). */}
                  {user && (
                    <ExtraRow
                      icon={Building2}
                      label={t("orderBuilderCard.extraInvoice")}
                      value={
                        wantsNifInvoice
                          ? (selectedCompany?.name ?? t("orderBuilderCard.chooseCompany"))
                          : null
                      }
                      valueTone={wantsNifInvoice && !selectedCompany ? "warning" : "muted"}
                      open={openExtra === "invoice"}
                      onToggle={() => toggleExtra("invoice")}
                    >
                      <label className="flex items-center gap-2.5 text-xs font-semibold">
                        <Checkbox
                          checked={wantsNifInvoice}
                          onCheckedChange={(checked) => {
                            setWantsNifInvoice(checked === true);
                            if (checked !== true) setCompanyId(null);
                          }}
                          className="border-primary-foreground/40 data-[state=checked]:bg-brand data-[state=checked]:text-brand-foreground"
                        />
                        {t("orderBuilderCard.wantsNifInvoice")}
                      </label>
                      {wantsNifInvoice && (
                        <div className="mt-2 space-y-1">
                          {companies.length === 0 && (
                            <p className="text-xs text-primary-foreground/60">
                              {t("orderBuilderCard.noCompanies")}
                            </p>
                          )}
                          {companies.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              role="radio"
                              aria-checked={companyId === c.id}
                              onClick={() => setCompanyId(c.id)}
                              className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left ${
                                companyId === c.id
                                  ? "bg-white/10 ring-1 ring-brand"
                                  : "hover:bg-white/5"
                              }`}
                            >
                              <RadioDot checked={companyId === c.id} />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-xs font-bold">{c.name}</span>
                                <span className="block truncate text-[11px] text-primary-foreground/55">
                                  NIF {c.nif}
                                </span>
                              </span>
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setCompanyDialogOpen(true)}
                            className="inline-flex items-center gap-1 px-1 pt-1 text-xs font-semibold text-brand hover:underline"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            {t("orderBuilderCard.newCompany")}
                          </button>
                        </div>
                      )}
                    </ExtraRow>
                  )}
                </div>
              </section>

              {/* ---------- 3. Resumo (recibo) + enviar ---------- */}
              <div className="mt-5 space-y-1.5 border-t border-white/10 pt-3 text-sm">
                <SummaryRow label={t("orderBuilderCard.subtotal")} value={formatKz(total)} />
                {mode === "delivery" && (
                  <SummaryRow
                    label={
                      deliveryKm != null
                        ? t("orderBuilderCard.deliveryRowKm", { km: deliveryKm })
                        : t("orderBuilderCard.deliveryRow")
                    }
                    value={
                      deliveryFeeShown == null
                        ? "—"
                        : deliveryFeeShown === 0
                          ? t("orderBuilderCard.deliveryFree")
                          : formatKz(deliveryFeeShown)
                    }
                    tone={deliveryFeeShown === 0 ? "success" : "default"}
                    hint={
                      deliverySurchargeKm > 0 && !promo?.freeDelivery
                        ? t("orderBuilderCard.deliverySurchargeNote", {
                            base: formatKz(restaurant.deliveryFee),
                            radius: deliveryPolicy.freeRadiusKm,
                            extraKm: deliverySurchargeKm,
                            surcharge: formatKz(deliveryPolicy.perKmSurchargeKz),
                          })
                        : undefined
                    }
                  />
                )}
                {promoDiscount > 0 && (
                  <SummaryRow
                    label={t("orderBuilderCard.discountRow")}
                    value={`− ${formatKz(promoDiscount)}`}
                    tone="success"
                  />
                )}
                {reservationCredit > 0 && (
                  <SummaryRow
                    label={t("orderBuilderCard.reservationCreditRow")}
                    value={`− ${formatKz(reservationCredit)}`}
                    tone="success"
                  />
                )}
                <div className="flex items-baseline justify-between border-t border-white/10 pt-2.5">
                  <span className="font-bold">{t("orderBuilderCard.estimatedTotal")}</span>
                  <span className="font-display text-xl font-extrabold tabular-nums">
                    {formatKz(estimatedTotal)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                disabled={
                  (mode === "delivery" && !chosenAddressId) ||
                  (wantsNifInvoice && !companyId) ||
                  submitting
                }
                onClick={submit}
                className="mt-4 w-full rounded-xl bg-brand px-5 py-3 text-sm font-bold text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {t("orderBuilderCard.sendOrder")}
              </button>
              <p className="mt-2 text-center text-[11px] leading-snug text-primary-foreground/45">
                {t("orderBuilderCard.paymentAfterAccept")}
              </p>

              <CompanyFormDialog
                open={companyDialogOpen}
                onOpenChange={setCompanyDialogOpen}
                onCreated={(company) => {
                  setCompanyId(company.id);
                  setWantsNifInvoice(true);
                }}
              />
            </div>
          )}
        </div>
      )}

      <RestaurantRecommendationsDialog
        open={recommendationsOpen}
        onOpenChange={setRecommendationsOpen}
        restaurant={restaurant}
        mode={mode}
        reasonText={pausedMessage}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Peças de apresentação do cartão (fundo escuro, ver OrderBuilderCard) */
/* ------------------------------------------------------------------ */

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-wide text-primary-foreground/45">
      {children}
    </p>
  );
}

/** Opções lado a lado, a escolhida em "pílula" clara — cor da marca fica só
 * para a ação principal. */
function SegmentedControl<T extends string>({
  ariaLabel,
  value,
  onChange,
  options,
  className = "",
}: {
  ariaLabel: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; icon?: typeof Bike }[];
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-white/5 p-1 ${className}`}
    >
      {options.map((option) => {
        const active = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={`flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-bold transition-colors ${
              active
                ? "bg-primary-foreground text-neutral-900 shadow-sm"
                : "text-primary-foreground/65 hover:text-primary-foreground"
            }`}
          >
            {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** − quantidade +; no mínimo, o "−" vira lixo (remove a linha) — dispensa
 * um botão "×" à parte em cada linha. */
function QtyStepper({
  qty,
  onChange,
  labels,
  min = 0,
  max = 99,
}: {
  qty: number;
  onChange: (qty: number) => void;
  labels: { decrease: string; increase: string; remove: string };
  min?: number;
  max?: number;
}) {
  const removes = min === 0 && qty <= 1;
  return (
    <div className="flex shrink-0 items-center rounded-full bg-white/10">
      <button
        type="button"
        aria-label={removes ? labels.remove : labels.decrease}
        disabled={!removes && qty <= Math.max(min, 1)}
        onClick={() => onChange(Math.max(min, qty - 1))}
        className={`grid h-8 w-8 place-items-center rounded-full transition-colors disabled:opacity-30 ${
          removes
            ? "text-primary-foreground/60 hover:text-destructive"
            : "text-primary-foreground/80 hover:text-primary-foreground"
        }`}
      >
        {removes ? <Trash2 className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
      </button>
      <span className="w-5 text-center text-sm font-bold tabular-nums">{qty}</span>
      <button
        type="button"
        aria-label={labels.increase}
        disabled={qty >= max}
        onClick={() => onChange(Math.min(max, qty + 1))}
        className="grid h-8 w-8 place-items-center rounded-full text-primary-foreground/80 transition-colors hover:text-primary-foreground disabled:opacity-30"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function RadioDot({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 ${
        checked ? "border-brand" : "border-primary-foreground/35"
      }`}
    >
      {checked && <span className="h-1.5 w-1.5 rounded-full bg-brand" />}
    </span>
  );
}

/** Linha opcional recolhida: rótulo + o valor escolhido (se houver); abre
 * por baixo para editar. */
function ExtraRow({
  icon: Icon,
  label,
  value,
  valueTone = "muted",
  open,
  onToggle,
  children,
}: {
  icon: typeof Bike;
  label: string;
  value: string | null;
  valueTone?: "muted" | "success" | "warning";
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const toneClass =
    valueTone === "success"
      ? "text-success"
      : valueTone === "warning"
        ? "text-brand"
        : "text-primary-foreground/55";
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-white/5"
      >
        <Icon className="h-4 w-4 shrink-0 text-primary-foreground/55" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{label}</span>
          {value && <span className={`block truncate text-xs ${toneClass}`}>{value}</span>}
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-primary-foreground/50" />
        ) : value ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-primary-foreground/50" />
        ) : (
          <Plus className="h-4 w-4 shrink-0 text-primary-foreground/50" />
        )}
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

/** Uma linha do resumo: rótulo à esquerda, valor alinhado à direita;
 * `hint` é uma explicação curta por baixo (ex.: como a taxa foi calculada). */
function SummaryRow({
  label,
  value,
  tone = "default",
  hint,
}: {
  label: string;
  value: string;
  tone?: "default" | "success";
  hint?: string | undefined;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-primary-foreground/70">{label}</span>
        <span
          className={`shrink-0 font-semibold tabular-nums ${tone === "success" ? "text-success" : ""}`}
        >
          {value}
        </span>
      </div>
      {hint && <p className="mt-0.5 text-[11px] text-primary-foreground/45">{hint}</p>}
    </div>
  );
}
