import { useNavigate } from "@tanstack/react-router";
import { Info, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Restaurant } from "@/data/types";
import { useTranslation } from "@/i18n";
import { formatKz } from "@/lib/format";
import { useReservations } from "@/lib/reservations";
import { useRestaurantStatus } from "@/lib/restaurant-status";
import { useTables } from "@/lib/tables";

const DEFAULT_SLOT_MIN = 120;
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
}: {
  restaurant: Restaurant;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { reservations, addReservation } = useReservations();
  const { totalSeats } = useTables();
  const status = useRestaurantStatus(restaurant.id);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [peopleCount, setPeopleCount] = useState(2);
  const [specialRequests, setSpecialRequests] = useState("");

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    addReservation({ restaurant, date, time, peopleCount, specialRequests });
    toast.success(t("reservationDialog.sentToast"));
    onOpenChange(false);
    setDate("");
    setTime("");
    setPeopleCount(2);
    setSpecialRequests("");
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
                value={peopleCount}
                onChange={(e) => setPeopleCount(Math.max(1, Number(e.target.value) || 1))}
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

            {restaurant.cautionAmount > 0 && (
              <div className="flex items-start gap-2 rounded-xl border border-brand/30 bg-brand/5 p-3 text-xs text-foreground">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                <span>
                  {t("reservationDialog.cautionNotice", {
                    amount: formatKz(restaurant.cautionAmount),
                    policy: restaurant.cautionPolicyNotice,
                  })}
                </span>
              </div>
            )}

            <Button type="submit" disabled={!canSubmit} className="w-full rounded-xl">
              {t("reservationDialog.submit")}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
