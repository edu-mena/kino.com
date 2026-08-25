import { createFileRoute } from "@tanstack/react-router";
import { Mail, MessageCircle, Phone, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AdminPageHeading } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
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
import { useRestaurantAdmin } from "@/lib/restaurant-admin";

export const Route = createFileRoute("/admin/suporte")({
  head: () => ({ meta: [{ title: "Suporte — Painel Kino.com" }] }),
  component: AdminSuporte,
});

const subjects = [
  { value: "nome", label: "Alterar nome do restaurante" },
  { value: "destaque", label: "Alterar categoria de destaque" },
  { value: "avaliacao", label: "Contestar uma avaliação" },
  { value: "pagamentos", label: "Dúvida sobre pagamentos/caução" },
  { value: "tecnico", label: "Problema técnico" },
  { value: "outro", label: "Outro assunto" },
] as const;

function AdminSuporte() {
  const { restaurant } = useRestaurantAdmin();
  const [subject, setSubject] = useState<(typeof subjects)[number]["value"]>("nome");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  if (!restaurant) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error("Escreva a sua mensagem primeiro.");
      return;
    }
    setSending(true);
    // Sem backend real — a app não tem sistema de tickets, isto simula o
    // envio (mesmo espírito do resto da app: um pedido de reserva/pagamento
    // também não é processado de verdade, só encaminhado).
    setTimeout(() => {
      toast.success("Pedido enviado — a equipa de parceiros Kino entra em contacto em breve.");
      setMessage("");
      setSending(false);
    }, 600);
  };

  return (
    <div className="pb-16">
      <AdminPageHeading
        eyebrow="Suporte"
        title="Fale com a Kino"
        description="Para o que não pode alterar diretamente no painel — nome, categoria de destaque, disputas — ou qualquer outra dúvida."
      />

      <div className="mx-auto mt-8 max-w-4xl px-4 md:px-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="card-soft flex items-center gap-3 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface text-brand">
              <Phone className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">+244 923 000 000</p>
              <p className="truncate text-xs text-muted-foreground">Todos os dias, 8h - 23h</p>
            </div>
          </div>
          <div className="card-soft flex items-center gap-3 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface text-brand">
              <Mail className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">parceiros@kino.com</p>
              <p className="truncate text-xs text-muted-foreground">Resposta em 1 dia útil</p>
            </div>
          </div>
          <div className="card-soft flex items-center gap-3 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface text-brand">
              <MessageCircle className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">Chat ao vivo</p>
              <p className="truncate text-xs text-muted-foreground">Resposta em ~2 minutos</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card-soft mt-6 space-y-4 p-6">
          <h2 className="font-display text-base font-bold text-foreground">Enviar uma mensagem</h2>

          <div className="space-y-1.5">
            <Label htmlFor="support-restaurant">Restaurante</Label>
            <Input id="support-restaurant" value={restaurant.name} disabled />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="support-subject">Assunto</Label>
            <Select value={subject} onValueChange={(v) => setSubject(v as typeof subject)}>
              <SelectTrigger id="support-subject" className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="support-message">Mensagem</Label>
            <Textarea
              id="support-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Descreva o que precisa..."
              className="min-h-32 rounded-xl"
            />
          </div>

          <Button type="submit" disabled={sending} className="w-full rounded-xl">
            <Send className="h-4 w-4" /> {sending ? "A enviar..." : "Enviar pedido"}
          </Button>
        </form>
      </div>
    </div>
  );
}
