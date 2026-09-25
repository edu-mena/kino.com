import { useNavigate } from "@tanstack/react-router";
import { Info, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { resolvePromoCode, type PromoEffect } from "@/data/offers-store";
import type { Restaurant, RestaurantPackage } from "@/data/types";
import { useOffers } from "@/data/use-offers";
import { usePublicRestaurantPackages } from "@/data/use-restaurants-query";
import { useTranslation } from "@/i18n";
import { formatKz } from "@/lib/format";
import { useReservations } from "@/lib/reservations";
import { useRestaurantStatus } from "@/lib/restaurant-status";
import { useTables } from "@/lib/tables";

const DEFAULT_SLOT_MIN = 120;
const TABLE_OPTION = "table";
const timeToMin = (s: string) => {
  const [h = 0, m = 0] = s.split(":").map(Number);
  return h * 60 + m;
};

/**
 * Pedido de reserva de mesa — sempre "Pendente" até o restaurante confirmar.
 * Dois clientes podem reservar a mesma hora enquanto houver lugares livres;
 * quando a sala não comporta o grupo, o pedido é bloqueado aqui.
 */
export function ReservationDialog({
  restaurant,
  open,
  onOpenChange,
  restaurantPackage,
}: {
  restaurant: Restaurant;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pré-seleciona um pacote específico (ex: aberto a partir de
   * `/pacotes/$packageTypeId` ou de um card de pacote na página do
   * restaurante) — o cliente continua a poder trocar para "Mesa normal" ou
   * outro pacote no seletor abaixo, se o restaurante oferecer mais do que
   * um. */
  restaurantPackage?: RestaurantPackage;
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { reservations, addReservation } = useReservations();
  const { totalSeats } = useTables();
  const status = useRestaurantStatus(restaurant.id);
  const { data: fetchedPackages = [] } = usePublicRestaurantPackages(restaurant.id);
  // O pacote pré-selecionado (se vier de fora) pode ainda não estar na
  // lista buscada (cache desatualizado, corrida de rede) — inclui-o à
  // parte, sem duplicar, pra nunca "desaparecer" o que o cliente já
  // escolheu antes de abrir este diálogo.
  const packageOptions = useMemo(() => {
    if (!restaurantPackage) return fetchedPackages;
    if (fetchedPackages.some((p) => p.id === restaurantPackage.id)) return fetchedPackages;
    return [restaurantPackage, ...fetchedPackages];
  }, [fetchedPackages, restaurantPackage]);

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  // String em vez de número: guardar já como número forçava um "1" a cada
  // apagão do campo (valor vazio → `Number("") || 1` → 1), que nunca saía
  // de lá — digitar a seguir só acrescentava dígitos ao "1" preso (12, 13…).
  // Só convertemos pra número (`peopleCount`, abaixo) pra fazer as contas.
  const [peopleCountInput, setPeopleCountInput] = useState("2");
  const peopleCount = Math.max(1, Math.min(30, Number(peopleCountInput) || 1));
  const [specialRequests, setSpecialRequests] = useState("");
  const [selectedPackageId, setSelectedPackageId] = useState(restaurantPackage?.id ?? TABLE_OPTION);
  const offers = useOffers();
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<PromoEffect | null>(null);
  const [promoError, setPromoError] = useState(false);

  // Reabastece a seleção sempre que o diálogo abre — evita herdar a
  // escolha de uma abertura anterior (ex: fechou tendo escolhido "Mesa
  // normal", reabriu a partir de um card de pacote diferente).
  useEffect(() => {
    if (open) setSelectedPackageId(restaurantPackage?.id ?? TABLE_OPTION);
  }, [open, restaurantPackage]);

  const selectedPackage =
    selectedPackageId === TABLE_OPTION
      ? undefined
      : packageOptions.find((p) => p.id === selectedPackageId);

  const cautionBase = selectedPackage ? selectedPackage.price : restaurant.cautionAmount;
  const discountedCaution = promo
    ? Math.round(cautionBase * (1 - promo.percentOff / 100))
    : cautionBase;

  const resetPromo = () => {
    setPromoInput("");
    setPromo(null);
    setPromoError(false);
  };
  // Só promoções sem prato/categoria alvo e que não sejam "entrega grátis"
  // descontam a caução — mesma regra do backend real (a caução não é
  // itemizada, ver ReservationController::store).
  const applyPromo = () => {
    const trimmed = promoInput.trim();
    if (!trimmed) {
      resetPromo();
      return;
    }
    const effect = resolvePromoCode(restaurant.id, trimmed, offers);
    const applicable =
      effect &&
      !effect.freeDelivery &&
      !effect.targetMenuItemIds.length &&
      !effect.targetCategories.length;
    setPromo(applicable ? effect : null);
    setPromoError(!applicable);
  };

  const paused = !status.available;
  const accepts = restaurant.acceptsReservations ?? true;
  const capacity = totalSeats(restaurant.id);
  const slotMin = restaurant.reservationSlotMinutes ?? DEFAULT_SLOT_MIN;
  const todayStr = new Date().toISOString().slice(0, 10);

  // Lugares já reservados na janela de tempo escolhida (mesma data).
  const bookedInWindow = useMemo(() => {
    if (!date || !time) return 0;
    const target = timeToMin(time);
    return reservations
      .filter(
        (r) =>
          r.restaurantId === restaurant.id &&
          r.date === date &&
          (r.status === "Pendente" || r.status === "Confirmada") &&
          Math.abs(timeToMin(r.time) - target) < slotMin,
      )
      .reduce((sum, r) => sum + r.peopleCount, 0);
  }, [reservations, restaurant.id, date, time, slotMin]);

  const remaining = capacity > 0 ? Math.max(0, capacity - bookedInWindow) : Infinity;
  const fits = peopleCount <= remaining;
  const canSubmit = accepts && !paused && date !== "" && time !== "" && fits;

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    const ok = await addReservation({
      restaurant,
      date,
      time,
      peopleCount,
      specialRequests,
      ...(promo ? { promoCode: promo.code } : {}),
      ...(selectedPackage ? { packageId: selectedPackage.id } : {}),
    });
    setSubmitting(false);
    if (!ok) {
      toast.error(t("reservationDialog.sentErrorToast"));
      return;
    }
    toast.success(t("reservationDialog.sentToast"));
    onOpenChange(false);
    setDate("");
    setTime("");
    setPeopleCountInput("2");
    setSpecialRequests("");
    resetPromo();
    navigate({ to: "/reservas" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-[1.5rem] border-none bg-card p-6">
        <DialogTitle className="font-display text-lg font-bold">
          {t("reservationDialog.title", { name: restaurant.name })}
        </DialogTitle>
        <DialogDescription>{t("reservationDialog.description")}</DialogDescription>

        {paused ? (
          <p className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            {status.reason === "closed"
              ? t("reservationDialog.closedNow", { opensAt: status.opensAt ?? "" })
              : t("reservationDialog.paused")}
          </p>
        ) : !accepts ? (
          <p className="mt-4 flex items-start gap-2 rounded-xl border border-border bg-surface p-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            {t("reservationDialog.notAccepting")}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-2 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="res-date">{t("reservationDialog.dateLabel")}</Label>
                <Input
                  id="res-date"
                  type="date"
                  min={todayStr}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="res-time">{t("reservationDialog.timeLabel")}</Label>
                <Input
                  id="res-time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="res-people">{t("reservationDialog.peopleLabel")}</Label>
              <Input
                id="res-people"
                type="number"
                min={1}
                max={30}
                value={peopleCountInput}
                onChange={(e) => setPeopleCountInput(e.target.value)}
                onBlur={() => setPeopleCountInput(String(peopleCount))}
                required
              />
            </div>

            {date && time && capacity > 0 && (
              <p
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs ${
                  fits ? "bg-surface text-muted-foreground" : "bg-destructive/10 text-destructive"
                }`}
              >
                {fits ? (
                  t("reservationDialog.remainingSeats", { count: remaining })
                ) : (
                  <>
                    <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
                    {t("reservationDialog.noSeats", { count: peopleCount })}
                  </>
                )}
              </p>
            )}

            {packageOptions.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="res-type">{t("reservationDialog.typeLabel")}</Label>
                <Select value={selectedPackageId} onValueChange={setSelectedPackageId}>
                  <SelectTrigger id="res-type" className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TABLE_OPTION}>{t("reservationDialog.typeTable")}</SelectItem>
                    {packageOptions.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title ?? p.packageType.name} — {formatKz(p.price)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="res-notes">{t("reservationDialog.notesLabel")}</Label>
              <Textarea
                id="res-notes"
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                placeholder={t("reservationDialog.notesPlaceholder")}
                className="rounded-xl"
              />
            </div>

            {cautionBase > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="res-promo">{t("reservationDialog.promoLabel")}</Label>
                <div className="flex gap-2">
                  <Input
                    id="res-promo"
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
                    placeholder={t("reservationDialog.promoPlaceholder")}
                    className="uppercase"
                  />
                  {promo ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetPromo}
                      className="shrink-0 rounded-xl"
                    >
                      {t("reservationDialog.promoRemove")}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={applyPromo}
                      className="shrink-0 rounded-xl"
                    >
                      {t("reservationDialog.promoApply")}
                    </Button>
                  )}
                </div>
                {promoError && (
                  <p className="text-xs text-destructive">{t("reservationDialog.promoInvalid")}</p>
                )}
                {promo && (
                  <p className="text-xs font-semibold text-success">
                    {t("reservationDialog.promoApplied", { label: promo.label })}
                  </p>
                )}
              </div>
            )}

            {cautionBase > 0 && (
              <div className="flex items-start gap-2 rounded-xl border border-brand/30 bg-brand/5 p-3 text-xs text-foreground">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                <span>
                  {selectedPackage
                    ? t("reservationDialog.packageNotice", {
                        title: selectedPackage.title ?? selectedPackage.packageType.name,
                        amount: formatKz(discountedCaution),
                      })
                    : t("reservationDialog.cautionNotice", {
                        amount: formatKz(discountedCaution),
                        policy: restaurant.cautionPolicyNotice,
                      })}
                </span>
              </div>
            )}

            <Button type="submit" disabled={!canSubmit || submitting} className="w-full rounded-xl">
              {t("reservationDialog.submit")}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
