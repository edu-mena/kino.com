import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bike,
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Clock,
  MapPin,
  Minus,
  Plus,
  Receipt,
  ShieldAlert,
  ShoppingBag,
  Trash2,
  Users,
  Utensils,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CompanyFormDialog } from "@/components/company-form-dialog";
import { RestaurantRecommendationsDialog } from "@/components/restaurant-recommendations-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { UseCurrentLocationField } from "@/components/use-current-location-field";
import {
  addressProvince,
  canDeliverToNeighborhood,
  getDeliveryZones,
  getRestaurantFulfillmentModes,
  orderModeRequiresCaution,
} from "@/data/helpers";
import { resolvePromoCode, type PromoEffect } from "@/data/offers-store";
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

export function OrderBuilderCard() {
  const { t } = useTranslation();
  const { restaurantId, lines, updateQty, discard } = useBill();
  const { addOrder } = useCart();
  const { user } = useAuth();
  const { companies } = useCompanies();
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
  const [submitting, setSubmitting] = useState(false);

  if (!restaurantId || lines.length === 0) return null;

  const restaurant = restaurantQuery.data;
  if (!restaurant) {
    // Nunca esconder o cartão em silêncio enquanto há itens na lista — só
    // `null` quando não há mesmo lista (acima). A carregar ou falhado, o
    // cliente continua a ver que tem algo pendente.
    return (
      <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-40 w-80 max-w-[calc(100vw-2rem)] rounded-[1.5rem] bg-neutral-900 p-4 text-primary-foreground shadow-xl">
        <span className="flex items-center gap-2 font-display text-sm font-bold">
          <Receipt className="h-4 w-4 shrink-0" />
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
  const promoDiscount = promo?.percentOff ? Math.round(total * (promo.percentOff / 100)) : 0;

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

  const goToConfirm = () => {
    if (paused) {
      toast.error(pausedMessage);
      return;
    }
    setChosenAddressId(headerLocation?.id ?? allAddresses[0]?.id ?? null);
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
    toast.success(t("orderBuilderCard.orderCreatedToast"));
    navigate({ to: "/entrega" });
  };

  return (
    <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-40 w-80 max-w-[calc(100vw-2rem)] rounded-[1.5rem] bg-neutral-900 text-primary-foreground shadow-xl">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-label={expanded ? "Minimizar lista do pedido" : "Expandir lista do pedido"}
        className="flex w-full items-center justify-between gap-3 p-4"
      >
        <span className="flex min-w-0 items-center gap-2 font-display text-sm font-bold">
          <Receipt className="h-4 w-4 shrink-0" />
          <span className="truncate">{restaurant.name}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2 text-sm font-bold">
          {formatKz(total)}
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </span>
      </button>

      {expanded && (
        // `max-h`/`overflow-y-auto`: sem isto, o passo de confirmação (morada,
        // nota, promo…) podia crescer mais alto do que o ecrã e deixar o
        // botão de enviar fora de vista — o mesmo problema que tinha o
        // diálogo que isto substituiu (ver comentário no topo do ficheiro).
        <div className="max-h-[min(32rem,70dvh)] overflow-y-auto border-t border-primary-foreground/20 p-4 pt-3">
          {step === "list" ? (
            <>
              <ul className="max-h-36 space-y-2 overflow-y-auto">
                {lines.map((line) => {
                  const item = menuItemsById.get(line.menuItemId);
                  if (!item) return null;
                  return (
                    <li key={line.key} className="flex items-center gap-2 text-sm">
                      <span className="min-w-0 flex-1 truncate">{item.name}</span>
                      <button
                        type="button"
                        aria-label="Diminuir"
                        onClick={() => updateQty(line.key, line.qty - 1)}
                        className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-primary-foreground/30 text-primary-foreground/80 hover:border-primary-foreground hover:text-primary-foreground"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-4 shrink-0 text-center font-semibold">{line.qty}</span>
                      <button
                        type="button"
                        aria-label="Aumentar"
                        onClick={() => updateQty(line.key, line.qty + 1)}
                        className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-primary-foreground/30 text-primary-foreground/80 hover:border-primary-foreground hover:text-primary-foreground"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <span className="w-16 shrink-0 text-right font-semibold">
                        {formatKz(billLineUnitPrice(line, item) * line.qty)}
                      </span>
                      <button
                        type="button"
                        aria-label="Remover"
                        onClick={() => updateQty(line.key, 0)}
                        className="shrink-0 text-primary-foreground/70 hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-3 flex items-center justify-between border-t border-primary-foreground/20 pt-3 text-sm">
                <span className="font-bold">{t("orderBuilderCard.total")}</span>
                <span className="font-extrabold">{formatKz(total)}</span>
              </div>

              <div className="mt-3 space-y-2">
                {paused ? (
                  <div className="rounded-xl border border-dashed border-primary-foreground/30 px-3 py-2.5 text-center text-xs text-primary-foreground/80">
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
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-foreground/50">
                      {t("orderBuilderCard.chooseMode")}
                    </p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {availableModes.map((m) => {
                        const Icon = MODE_ICON[m];
                        return (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setModeOverride(m)}
                            aria-pressed={mode === m}
                            className={`flex flex-col items-center gap-1 rounded-xl border px-1.5 py-2 text-[11px] font-semibold transition-colors ${
                              mode === m
                                ? "border-brand bg-brand/15 text-primary-foreground"
                                : "border-primary-foreground/20 text-primary-foreground/70 hover:border-primary-foreground/50"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                            {t(`fulfillment.${m}`)}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={goToConfirm}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-brand-foreground transition-opacity hover:opacity-90"
                    >
                      {t("orderBuilderCard.continue")}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={discard}
                  className="flex w-full items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-primary-foreground/70 transition-colors hover:text-primary-foreground"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t("orderBuilderCard.discardList")}
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep("list")}
                className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-primary-foreground/70 transition-colors hover:text-primary-foreground"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                {t("orderBuilderCard.backToList")}
              </button>

              <p className="text-xs text-primary-foreground/50">
                {lines.length}{" "}
                {lines.length === 1
                  ? t("orderBuilderCard.itemSingular")
                  : t("orderBuilderCard.itemPlural")}{" "}
                · {formatKz(total)}
              </p>

              <h3 className="mt-2 font-display text-base font-bold">
                {mode === "delivery"
                  ? t("orderBuilderCard.confirmLocationTitle")
                  : mode === "takeaway"
                    ? t("orderBuilderCard.takeawayTitle")
                    : t("orderBuilderCard.dineinTitle")}
              </h3>
              <p className="mt-1 text-xs text-primary-foreground/60">
                {mode === "delivery"
                  ? t("orderBuilderCard.confirmLocationDesc")
                  : mode === "takeaway"
                    ? t("orderBuilderCard.takeawayDesc")
                    : t("orderBuilderCard.dineinDesc")}
              </p>

              {/* ---------- DELIVERY ---------- */}
              {mode === "delivery" && (
                <>
                  <p className="mt-2 rounded-lg bg-white/5 px-3 py-2 text-xs text-primary-foreground/60">
                    {t("orderBuilderCard.coveredZones", {
                      zones: getDeliveryZones(restaurant).join(", ") || restaurant.neighborhood,
                    })}
                  </p>
                  <div className="mt-3 space-y-2">
                    {allAddresses.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setChosenAddressId(a.id)}
                        className={`grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border p-3 text-left ${
                          chosenAddressId === a.id
                            ? "border-brand bg-brand/15"
                            : "border-primary-foreground/20"
                        }`}
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/5 text-brand">
                          <MapPin className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold">{a.label}</span>
                          <span className="block truncate text-xs text-primary-foreground/60">
                            {a.line1}
                          </span>
                        </span>
                        {chosenAddressId === a.id && (
                          <Check className="h-4 w-4 shrink-0 text-brand" />
                        )}
                      </button>
                    ))}
                    {allAddresses.length === 0 && (
                      <p className="rounded-xl border border-dashed border-primary-foreground/20 p-3 text-center text-xs text-primary-foreground/60">
                        {t("orderBuilderCard.noSavedAddresses")}
                      </p>
                    )}
                  </div>

                  {useLocationOpen ? (
                    <div className="mt-3">
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
                    <button
                      type="button"
                      onClick={() => setUseLocationOpen(true)}
                      className="mt-3 flex w-full items-center gap-2 text-xs font-semibold text-brand hover:underline"
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      {t("useLocation.cta")}
                    </button>
                  )}

                  <Link
                    to="/perfil"
                    onClick={() => setExpanded(false)}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t("orderBuilderCard.addNewAddress")}
                  </Link>

                  {deliveryKm != null && deliveryFeeEstimate != null && (
                    <div className="mt-3 rounded-lg bg-white/5 px-3 py-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-primary-foreground/60">
                          {t("orderBuilderCard.deliveryFeeEstimate", { km: deliveryKm })}
                        </span>
                        <span className="font-bold">
                          {deliveryFeeEstimate === 0
                            ? t("orderBuilderCard.deliveryFree")
                            : formatKz(deliveryFeeEstimate)}
                        </span>
                      </div>
                      {deliverySurchargeKm > 0 && !promo?.freeDelivery && (
                        <p className="mt-1 text-[11px] text-primary-foreground/50">
                          {t("orderBuilderCard.deliverySurchargeNote", {
                            base: formatKz(restaurant.deliveryFee),
                            radius: deliveryPolicy.freeRadiusKm,
                            extraKm: deliverySurchargeKm,
                            surcharge: formatKz(deliveryPolicy.perKmSurchargeKz),
                          })}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* ---------- TAKEAWAY ---------- */}
              {mode === "takeaway" && (
                <div className="mt-3 space-y-2">
                  {(["asap", "scheduled"] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setPickupChoice(c)}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm font-semibold ${
                        pickupChoice === c
                          ? "border-brand bg-brand/15"
                          : "border-primary-foreground/20"
                      }`}
                    >
                      <Clock className="h-4 w-4 shrink-0 text-brand" />
                      {c === "asap"
                        ? t("orderBuilderCard.pickupAsap")
                        : t("orderBuilderCard.pickupScheduled")}
                    </button>
                  ))}
                  {pickupChoice === "scheduled" && (
                    <label className="block pt-1 text-xs font-semibold">
                      {t("orderBuilderCard.pickupTimeLabel")}
                      <input
                        type="time"
                        value={pickupTime}
                        onChange={(e) => setPickupTime(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-primary-foreground/20 bg-white/5 px-3 py-2 text-sm text-primary-foreground outline-none transition-colors focus:border-primary-foreground/50"
                      />
                    </label>
                  )}
                </div>
              )}

              {/* ---------- DINE-IN ---------- */}
              {mode === "dinein" && (
                <div className="mt-3">
                  <p className="text-xs font-semibold">{t("orderBuilderCard.partySizeLabel")}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <button
                      type="button"
                      aria-label="Diminuir"
                      onClick={() => setPartySize((n) => Math.max(1, n - 1))}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-primary-foreground/20 hover:border-primary-foreground/50"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="flex items-center gap-1.5 text-lg font-bold">
                      <Users className="h-4 w-4 text-brand" />
                      {partySize}
                    </span>
                    <button
                      type="button"
                      aria-label="Aumentar"
                      onClick={() => setPartySize((n) => Math.min(20, n + 1))}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-primary-foreground/20 hover:border-primary-foreground/50"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Caução do modo */}
              {cautionForMode && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-brand/40 bg-brand/10 p-3">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  <div className="min-w-0 text-xs">
                    <p className="font-bold">{t("orderBuilderCard.cautionNoticeTitle")}</p>
                    <p className="mt-0.5 text-primary-foreground/60">
                      {t("orderBuilderCard.cautionNotice", {
                        amount: formatKz(restaurant.cautionAmount),
                        policy: restaurant.cautionPolicyNotice,
                      })}
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-3 space-y-1.5">
                <label htmlFor="order-note" className="text-xs font-semibold">
                  {t("orderBuilderCard.noteLabel")}
                </label>
                <textarea
                  id="order-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t("orderBuilderCard.notePlaceholder")}
                  rows={2}
                  className="w-full rounded-xl border border-primary-foreground/20 bg-white/5 px-3 py-2 text-sm text-primary-foreground placeholder:text-primary-foreground/40 outline-none transition-colors focus:border-primary-foreground/50"
                />
              </div>

              {/* Código promocional */}
              <div className="mt-3 space-y-1.5">
                <label htmlFor="order-promo" className="text-xs font-semibold">
                  {t("orderBuilderCard.promoLabel")}
                </label>
                <div className="flex gap-2">
                  <input
                    id="order-promo"
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
                    className={`min-w-0 flex-1 rounded-xl border bg-white/5 px-3 py-2 text-sm uppercase text-primary-foreground outline-none transition-colors placeholder:text-primary-foreground/40 focus:border-primary-foreground/50 ${
                      promoError ? "border-destructive" : "border-primary-foreground/20"
                    }`}
                  />
                  {promo ? (
                    <button
                      type="button"
                      onClick={resetPromo}
                      className="shrink-0 rounded-xl border border-primary-foreground/20 px-3 py-2 text-xs font-semibold text-primary-foreground/70 transition-colors hover:border-destructive hover:text-destructive"
                    >
                      {t("orderBuilderCard.promoRemove")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={applyPromo}
                      className="shrink-0 rounded-xl border border-brand px-3 py-2 text-xs font-bold text-brand transition-colors hover:bg-brand/10"
                    >
                      {t("orderBuilderCard.promoApply")}
                    </button>
                  )}
                </div>
                {promoError && (
                  <p className="text-xs text-destructive">{t("orderBuilderCard.promoInvalid")}</p>
                )}
                {promo && (
                  <div className="rounded-xl border border-success/40 bg-success/10 p-2.5 text-xs">
                    <p className="font-bold text-success">{promo.label}</p>
                    <p className="mt-0.5 text-primary-foreground/60">
                      {promoDiscount > 0
                        ? t("orderBuilderCard.promoDiscountApplied", {
                            amount: formatKz(promoDiscount),
                          })
                        : t("orderBuilderCard.promoFreeDeliveryApplied")}
                    </p>
                  </div>
                )}
              </div>

              {/* Fatura com NIF — exige conta (empresas são só do cliente
                  autenticado, ver Company/CompanyController no backend). */}
              {user && (
                <div className="mt-3 space-y-2">
                  <label className="flex items-center gap-2 text-xs font-semibold">
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
                    <div className="space-y-1.5 rounded-xl bg-white/5 p-2.5">
                      {companies.length === 0 ? (
                        <p className="px-0.5 text-xs text-primary-foreground/60">
                          {t("orderBuilderCard.noCompanies")}
                        </p>
                      ) : (
                        companies.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setCompanyId(c.id)}
                            className={`flex w-full items-center gap-2.5 rounded-lg border p-2 text-left ${
                              companyId === c.id
                                ? "border-brand bg-brand/15"
                                : "border-primary-foreground/20"
                            }`}
                          >
                            <Building2 className="h-3.5 w-3.5 shrink-0 text-brand" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-xs font-bold">{c.name}</span>
                              <span className="block truncate text-[11px] text-primary-foreground/60">
                                NIF {c.nif}
                              </span>
                            </span>
                            {companyId === c.id && (
                              <Check className="h-3.5 w-3.5 shrink-0 text-brand" />
                            )}
                          </button>
                        ))
                      )}
                      <button
                        type="button"
                        onClick={() => setCompanyDialogOpen(true)}
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-primary-foreground/30 py-2 text-xs font-semibold text-primary-foreground/80 hover:border-primary-foreground"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {t("orderBuilderCard.newCompany")}
                      </button>
                    </div>
                  )}
                </div>
              )}

              <p className="mt-3 text-center text-[11px] text-primary-foreground/50">
                {t("orderBuilderCard.paymentAfterAccept")}
              </p>

              <button
                type="button"
                disabled={
                  (mode === "delivery" && !chosenAddressId) ||
                  (wantsNifInvoice && !companyId) ||
                  submitting
                }
                onClick={submit}
                className="mt-3 w-full rounded-xl bg-brand px-5 py-3 text-sm font-bold text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {t("orderBuilderCard.sendOrder")}
              </button>

              <CompanyFormDialog
                open={companyDialogOpen}
                onOpenChange={setCompanyDialogOpen}
                onCreated={(company) => setCompanyId(company.id)}
              />
            </>
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
