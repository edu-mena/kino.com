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

const SUPPORT_EMAIL = "parceiros@kino.com";
const SUPPORT_WHATSAPP = "https://wa.me/244930814277";

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

  if (!restaurant) return null;

  // Sem backend a app não tem sistema de tickets — em vez de simular um
  // envio, abrimos o cliente de email do restaurante já preenchido, que é
  // a única ação real que o frontend consegue disparar sozinho.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error("Escreva a sua mensagem primeiro.");
      return;
    }
    const subjectLabel = subjects.find((s) => s.value === subject)?.label ?? "Suporte";
    const body = `${message}\n\n— ${restaurant.name}`;
    const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
      `[Painel Kino] ${subjectLabel}`,
    )}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    toast.success("A abrir o seu email para enviar o pedido à equipa de parceiros.");
    setMessage("");
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
          <a
            href="tel:+244923000000"
            className="card-soft flex items-center gap-3 p-4 transition-colors hover:border-primary"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface text-brand">
              <Phone className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">+244 923 000 000</p>
              <p className="truncate text-xs text-muted-foreground">Todos os dias, 8h - 23h</p>
            </div>
          </a>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="card-soft flex items-center gap-3 p-4 transition-colors hover:border-primary"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface text-brand">
              <Mail className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{SUPPORT_EMAIL}</p>
              <p className="truncate text-xs text-muted-foreground">Resposta em 1 dia útil</p>
            </div>
          </a>
          <a
            href={SUPPORT_WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="card-soft flex items-center gap-3 p-4 transition-colors hover:border-primary"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface text-brand">
              <MessageCircle className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">WhatsApp</p>
              <p className="truncate text-xs text-muted-foreground">Fale diretamente com a Kino</p>
            </div>
          </a>
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

          <Button type="submit" className="w-full rounded-xl">
            <Send className="h-4 w-4" /> Enviar pedido
          </Button>
        </form>
      </div>
    </div>
  );
}
