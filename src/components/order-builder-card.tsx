import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bike,
  Check,
  ChevronDown,
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
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  addressProvince,
  canDeliverToNeighborhood,
  getDeliveryZones,
  getMenuItem,
  getRestaurant,
  getRestaurantFulfillmentModes,
  orderModeRequiresCaution,
} from "@/data/helpers";
import { resolvePromoCode, type PromoEffect } from "@/data/offers-store";
import type { FulfillmentType } from "@/data/types";
import { useTranslation } from "@/i18n";
import { billLineUnitPrice, useBill } from "@/lib/bill";
import { useCart, type OrderFulfillment } from "@/lib/cart";
import { formatKz } from "@/lib/format";
import { useLocation } from "@/lib/location";
import { useRestaurantStatus } from "@/lib/restaurant-status";

/**
 * Card fixo no canto inferior direito — lista temporária de tudo o que foi
 * adicionado via o botão "+" dos pratos, sempre de UM restaurante de cada
 * vez (ver `useAddToBill`). Fica visível em qualquer página enquanto houver
 * itens; começa minimizado (só o cabeçalho com o total).
 *
 * Ao expandir, o cliente escolhe o modo (entrega / levantar / no local,
 * limitado aos que o restaurante oferece) e "Continuar" abre o diálogo com
 * os campos mínimos desse modo. O pedido sai como "pending"; o restaurante
 * é que fixa depois o método de pagamento exigido ao aceitar.
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
  const status = useRestaurantStatus(restaurantId ?? "");
  const { allAddresses, selected: headerLocation } = useLocation();
  const navigate = useNavigate();

  const [expanded, setExpanded] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [modeOverride, setModeOverride] = useState<FulfillmentType | null>(null);
  const [chosenAddressId, setChosenAddressId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<PromoEffect | null>(null);
  const [promoError, setPromoError] = useState(false);
  const [pickupChoice, setPickupChoice] = useState<"asap" | "scheduled">("asap");
  const [pickupTime, setPickupTime] = useState(defaultPickupTime);
  const [partySize, setPartySize] = useState(2);

  if (!restaurantId || lines.length === 0) return null;
  const restaurant = getRestaurant(restaurantId);
  if (!restaurant) return null;

  const paused = !status.available;
  const pausedMessage =
    status.reason === "closed"
      ? t("orderBuilderCard.closedNow", { opensAt: status.opensAt ?? "" })
      : t("orderBuilderCard.restaurantPaused");

  const availableModes = getRestaurantFulfillmentModes(restaurant);
  const mode: FulfillmentType =
    modeOverride && availableModes.includes(modeOverride) ? modeOverride : availableModes[0]!;

  const total = lines.reduce((sum, l) => sum + billLineUnitPrice(l) * l.qty, 0);
  const cautionForMode = orderModeRequiresCaution(restaurant, mode);
  const promoDiscount = promo?.percentOff ? Math.round(total * (promo.percentOff / 100)) : 0;

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
    const effect = restaurantId ? resolvePromoCode(restaurantId, trimmed) : null;
    setPromo(effect);
    setPromoError(!effect);
  };

  const openConfirm = () => {
    if (paused) {
      toast.error(pausedMessage);
      return;
    }
    setChosenAddressId(headerLocation?.id ?? allAddresses[0]?.id ?? null);
    setConfirmOpen(true);
  };

  const submit = () => {
    if (paused) {
      toast.error(pausedMessage);
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

    addOrder(
      restaurantId,
      lines.map((line) => ({
        menuItemId: line.menuItemId,
        qty: line.qty,
        selectedIngredients: line.selectedIngredients,
      })),
      fulfillment,
      note,
      promo,
    );
    discard();
    setConfirmOpen(false);
    setNote("");
    resetPromo();
    toast.success(t("orderBuilderCard.orderCreatedToast"));
    navigate({ to: "/entrega" });
  };

  return (
    <>
      <div className="fixed bottom-4 right-4 z-40 w-80 max-w-[calc(100vw-2rem)] rounded-[1.5rem] bg-neutral-900 text-primary-foreground shadow-xl">
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
          <div className="border-t border-primary-foreground/20 p-4 pt-3">
            <ul className="max-h-36 space-y-2 overflow-y-auto">
              {lines.map((line) => {
                const item = getMenuItem(line.menuItemId);
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
                      {formatKz(item.price * line.qty)}
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
              <span className="font-bold">Total</span>
              <span className="font-extrabold">{formatKz(total)}</span>
            </div>

            <div className="mt-3 space-y-2">
              {paused ? (
                <p className="rounded-xl border border-dashed border-primary-foreground/30 px-3 py-2.5 text-center text-xs text-primary-foreground/80">
                  {pausedMessage}
                </p>
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
                    onClick={openConfirm}
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
          </div>
        )}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm rounded-[1.5rem] border-none bg-card p-6">
          <DialogTitle className="font-display text-lg font-bold">
            {mode === "delivery"
              ? t("orderBuilderCard.confirmLocationTitle")
              : mode === "takeaway"
                ? t("orderBuilderCard.takeawayTitle")
                : t("orderBuilderCard.dineinTitle")}
          </DialogTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "delivery"
              ? t("orderBuilderCard.confirmLocationDesc")
              : mode === "takeaway"
                ? t("orderBuilderCard.takeawayDesc")
                : t("orderBuilderCard.dineinDesc")}
          </p>

          {/* ---------- DELIVERY ---------- */}
          {mode === "delivery" && (
            <>
              <p className="mt-2 rounded-lg bg-surface px-3 py-2 text-xs text-muted-foreground">
                {t("orderBuilderCard.coveredZones", {
                  zones: getDeliveryZones(restaurant).join(", ") || restaurant.neighborhood,
                })}
              </p>
              <div className="mt-4 space-y-2">
                {allAddresses.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setChosenAddressId(a.id)}
                    className={`grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border p-3 text-left ${
                      chosenAddressId === a.id ? "border-brand bg-brand/5" : "border-border"
                    }`}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface text-primary">
                      <MapPin className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">{a.label}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {a.line1}
                      </span>
                    </span>
                    {chosenAddressId === a.id && <Check className="h-4 w-4 shrink-0 text-brand" />}
                  </button>
                ))}
                {allAddresses.length === 0 && (
                  <p className="rounded-xl border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                    Ainda não tem endereços guardados.
                  </p>
                )}
              </div>
              <Link
                to="/perfil"
                onClick={() => setConfirmOpen(false)}
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar novo endereço
              </Link>
            </>
          )}

          {/* ---------- TAKEAWAY ---------- */}
          {mode === "takeaway" && (
            <div className="mt-4 space-y-2">
              {(["asap", "scheduled"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setPickupChoice(c)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm font-semibold ${
                    pickupChoice === c ? "border-brand bg-brand/5" : "border-border"
                  }`}
                >
                  <Clock className="h-4 w-4 shrink-0 text-primary" />
                  {c === "asap"
                    ? t("orderBuilderCard.pickupAsap")
                    : t("orderBuilderCard.pickupScheduled")}
                </button>
              ))}
              {pickupChoice === "scheduled" && (
                <label className="block pt-1 text-xs font-semibold text-foreground">
                  {t("orderBuilderCard.pickupTimeLabel")}
                  <input
                    type="time"
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
                  />
                </label>
              )}
            </div>
          )}

          {/* ---------- DINE-IN ---------- */}
          {mode === "dinein" && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-foreground">
                {t("orderBuilderCard.partySizeLabel")}
              </p>
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Diminuir"
                  onClick={() => setPartySize((n) => Math.max(1, n - 1))}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border text-foreground hover:border-primary"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="flex items-center gap-1.5 text-lg font-bold text-foreground">
                  <Users className="h-4 w-4 text-primary" />
                  {partySize}
                </span>
                <button
                  type="button"
                  aria-label="Aumentar"
                  onClick={() => setPartySize((n) => Math.min(20, n + 1))}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border text-foreground hover:border-primary"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Caução do modo */}
          {cautionForMode && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-brand/40 bg-brand/5 p-3">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              <div className="min-w-0 text-xs">
                <p className="font-bold text-foreground">
                  {t("orderBuilderCard.cautionNoticeTitle")}
                </p>
                <p className="mt-0.5 text-muted-foreground">
                  {t("orderBuilderCard.cautionNotice", {
                    amount: formatKz(restaurant.cautionAmount),
                    policy: restaurant.cautionPolicyNotice,
                  })}
                </p>
              </div>
            </div>
          )}

          <div className="mt-4 space-y-1.5">
            <label htmlFor="order-note" className="text-xs font-semibold text-foreground">
              {t("orderBuilderCard.noteLabel")}
            </label>
            <textarea
              id="order-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("orderBuilderCard.notePlaceholder")}
              rows={2}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
            />
          </div>

          {/* Código promocional */}
          <div className="mt-4 space-y-1.5">
            <label htmlFor="order-promo" className="text-xs font-semibold text-foreground">
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
                className={`min-w-0 flex-1 rounded-xl border bg-background px-3 py-2 text-sm uppercase outline-none transition-colors focus:border-primary ${
                  promoError ? "border-destructive" : "border-border"
                }`}
              />
              {promo ? (
                <button
                  type="button"
                  onClick={resetPromo}
                  className="shrink-0 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                >
                  {t("orderBuilderCard.promoRemove")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={applyPromo}
                  className="shrink-0 rounded-xl border border-primary px-3 py-2 text-xs font-bold text-primary transition-colors hover:bg-primary/5"
                >
                  {t("orderBuilderCard.promoApply")}
                </button>
              )}
            </div>
            {promoError && (
              <p className="text-xs text-destructive">{t("orderBuilderCard.promoInvalid")}</p>
            )}
            {promo && (
              <div className="rounded-xl border border-success/40 bg-success/5 p-2.5 text-xs">
                <p className="font-bold text-success">{promo.label}</p>
                <p className="mt-0.5 text-muted-foreground">
                  {promoDiscount > 0
                    ? t("orderBuilderCard.promoDiscountApplied", {
                        amount: formatKz(promoDiscount),
                      })
                    : t("orderBuilderCard.promoFreeDeliveryApplied")}
                </p>
              </div>
            )}
          </div>

          <p className="mt-3 text-center text-xs text-muted-foreground">
            {t("orderBuilderCard.paymentAfterAccept")}
          </p>

          <button
            type="button"
            disabled={mode === "delivery" && !chosenAddressId}
            onClick={submit}
            className="mt-4 w-full rounded-xl bg-brand px-5 py-3 text-sm font-bold text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {t("orderBuilderCard.sendOrder")}
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
