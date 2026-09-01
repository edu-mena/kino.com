import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bike,
  Check,
  ChevronDown,
  ChevronUp,
  MapPin,
  Minus,
  Plus,
  Receipt,
  Trash2,
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
} from "@/data/helpers";
import { useTranslation } from "@/i18n";
import { billLineUnitPrice, useBill } from "@/lib/bill";
import { useCart } from "@/lib/cart";
import { formatKz } from "@/lib/format";
import { useLocation } from "@/lib/location";
import { useRestaurantStatus } from "@/lib/restaurant-status";

/**
 * Card fixo no canto inferior direito — lista temporária de tudo o que foi
 * adicionado via o botão "+" dos pratos, sempre de UM restaurante de cada
 * vez (ver `useAddToBill`). Fica visível em qualquer página (cardápio,
 * página do restaurante, prato) enquanto houver itens; começa minimizado
 * (só o cabeçalho com o total) pra não tapar a escolha de outros pratos.
 *
 * Se o restaurante entrega, "Solicitar delivery" primeiro pede confirmação
 * da localização de entrega (pré-selecionada com a mesma do chip do header,
 * mas trocável) antes de criar o pedido e ir para `/entrega`. Pedir à
 * mesa/no local fica a cargo do próprio restaurante — fora do escopo por
 * agora.
 */
export function OrderBuilderCard() {
  const { t } = useTranslation();
  const { restaurantId, lines, updateQty, discard } = useBill();
  const { addOrder } = useCart();
  const status = useRestaurantStatus(restaurantId ?? "");
  const { allAddresses, selected: headerLocation } = useLocation();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [addressConfirmOpen, setAddressConfirmOpen] = useState(false);
  const [chosenAddressId, setChosenAddressId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  if (!restaurantId || lines.length === 0) return null;
  const restaurant = getRestaurant(restaurantId);
  if (!restaurant) return null;

  const paused = !status.available;
  const pausedMessage =
    status.reason === "closed"
      ? t("orderBuilderCard.closedNow", { opensAt: status.opensAt ?? "" })
      : t("orderBuilderCard.restaurantPaused");
  const canDeliver = restaurant.isDeliveryAvailable && !paused;
  const total = lines.reduce((sum, l) => sum + billLineUnitPrice(l) * l.qty, 0);

  const openAddressConfirm = () => {
    setChosenAddressId(headerLocation?.id ?? allAddresses[0]?.id ?? null);
    setAddressConfirmOpen(true);
  };

  const handleConfirmDelivery = () => {
    const address = allAddresses.find((a) => a.id === chosenAddressId);
    if (!address) {
      toast.error(t("orderBuilderCard.needAddress"));
      return;
    }
    if (paused) {
      toast.error(pausedMessage);
      return;
    }
    const province = addressProvince(address.line2);
    if (province && !canDeliverToNeighborhood(restaurant, province)) {
      toast.error(t("orderBuilderCard.outOfZone", { province }));
      return;
    }
    // Tudo o que está na lista vira UM pedido de entrega só — mesmo com
    // vários pratos diferentes, conta como um delivery único. As
    // personalizações do prato (ingredientes) seguem junto.
    addOrder(
      restaurantId,
      lines.map((line) => ({
        menuItemId: line.menuItemId,
        qty: line.qty,
        selectedIngredients: line.selectedIngredients,
      })),
      address,
      note,
    );
    discard();
    setAddressConfirmOpen(false);
    setNote("");
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
              {canDeliver ? (
                <button
                  type="button"
                  onClick={openAddressConfirm}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-brand-foreground transition-opacity hover:opacity-90"
                >
                  <Bike className="h-4 w-4" />
                  {t("orderBuilderCard.requestDelivery")}
                </button>
              ) : (
                <p className="rounded-xl border border-dashed border-primary-foreground/30 px-3 py-2.5 text-center text-xs text-primary-foreground/80">
                  {paused ? pausedMessage : t("orderBuilderCard.noDeliveryHere")}
                </p>
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

      <Dialog open={addressConfirmOpen} onOpenChange={setAddressConfirmOpen}>
        <DialogContent className="max-w-sm rounded-[1.5rem] border-none bg-card p-6">
          <DialogTitle className="font-display text-lg font-bold">
            {t("orderBuilderCard.confirmLocationTitle")}
          </DialogTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("orderBuilderCard.confirmLocationDesc")}
          </p>
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
                  <span className="block truncate text-xs text-muted-foreground">{a.line1}</span>
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
            onClick={() => setAddressConfirmOpen(false)}
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar novo endereço
          </Link>

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

          <button
            type="button"
            disabled={!chosenAddressId}
            onClick={handleConfirmDelivery}
            className="mt-5 w-full rounded-xl bg-brand px-5 py-3 text-sm font-bold text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            Confirmar e pedir
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
