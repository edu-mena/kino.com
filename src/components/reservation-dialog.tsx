import { useNavigate } from "@tanstack/react-router";
import { Info } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Restaurant } from "@/data/types";
import { formatKz } from "@/lib/format";
import { useReservations } from "@/lib/reservations";

/**
 * Pedido de reserva de mesa — sempre "Pendente" até o restaurante confirmar.
 * A Kino só encaminha o pedido; caução, horário definitivo e regras da mesa
 * ficam a cargo do restaurante (mesmo texto do Centro de Ajuda), por isso
 * este fluxo nunca usa linguagem de "finalizar pedido"/pagamento como o
 * checkout do carrinho — é um pedido de reserva, não uma compra.
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
  const { addReservation } = useReservations();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [peopleCount, setPeopleCount] = useState(2);
  const [specialRequests, setSpecialRequests] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time) return;
    addReservation({ restaurant, date, time, peopleCount, specialRequests });
    toast.success("Pedido de reserva enviado — aguarde a confirmação do restaurante.");
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
          Reservar mesa — {restaurant.name}
        </DialogTitle>
        <DialogDescription>
          Este é um pedido de reserva. O restaurante confirma o horário e eventual caução
          diretamente com você.
        </DialogDescription>

        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="res-date">Data</Label>
              <Input
                id="res-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="res-time">Hora</Label>
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
            <Label htmlFor="res-people">Número de pessoas</Label>
            <Input
              id="res-people"
              type="number"
              min={1}
              max={20}
              value={peopleCount}
              onChange={(e) => setPeopleCount(Number(e.target.value) || 1)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="res-notes">Pedidos especiais (opcional)</Label>
            <Textarea
              id="res-notes"
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder="Ex: mesa perto da janela, aniversário..."
              className="rounded-xl"
            />
          </div>

          {restaurant.cautionAmount > 0 && (
            <div className="flex items-start gap-2 rounded-xl border border-brand/30 bg-brand/5 p-3 text-xs text-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              <span>
                Este restaurante pode pedir uma caução de {formatKz(restaurant.cautionAmount)} —{" "}
                {restaurant.cautionPolicyNotice}
              </span>
            </div>
          )}

          <Button type="submit" className="w-full rounded-xl">
            Pedir reserva
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
