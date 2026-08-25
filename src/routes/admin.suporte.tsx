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
import { useTranslation } from "@/i18n";
import { useRestaurantAdmin } from "@/lib/restaurant-admin";

export const Route = createFileRoute("/admin/suporte")({
  head: () => ({ meta: [{ title: "Suporte — Painel Kino.com" }] }),
  component: AdminSuporte,
});

const SUPPORT_EMAIL = "parceiros@kino.com";
const SUPPORT_WHATSAPP = "https://wa.me/244930814277";

const subjectValues = ["nome", "destaque", "avaliacao", "pagamentos", "tecnico", "outro"] as const;

function AdminSuporte() {
  const { restaurant } = useRestaurantAdmin();
  const [subject, setSubject] = useState<(typeof subjectValues)[number]>("nome");
  const [message, setMessage] = useState("");
  const { t } = useTranslation();

  const subjects = [
    { value: "nome", label: t("adminSuporte.subjectName") },
    { value: "destaque", label: t("adminSuporte.subjectHighlight") },
    { value: "avaliacao", label: t("adminSuporte.subjectReview") },
    { value: "pagamentos", label: t("adminSuporte.subjectPayments") },
    { value: "tecnico", label: t("adminSuporte.subjectTechnical") },
    { value: "outro", label: t("adminSuporte.subjectOther") },
  ] as const;

  if (!restaurant) return null;

  // Sem backend a app não tem sistema de tickets — em vez de simular um
  // envio, abrimos o cliente de email do restaurante já preenchido, que é
  // a única ação real que o frontend consegue disparar sozinho.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error(t("adminSuporte.emptyMessageError"));
      return;
    }
    const subjectLabel = subjects.find((s) => s.value === subject)?.label ?? "Suporte";
    const body = `${message}\n\n— ${restaurant.name}`;
    const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
      `[Painel Kino] ${subjectLabel}`,
    )}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    toast.success(t("adminSuporte.openingEmailToast"));
    setMessage("");
  };

  return (
    <div className="pb-16">
      <AdminPageHeading
        eyebrow={t("adminSuporte.eyebrow")}
        title={t("adminSuporte.title")}
        description={t("adminSuporte.description")}
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
              <p className="truncate text-xs text-muted-foreground">
                {t("adminSuporte.phoneHint")}
              </p>
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
              <p className="truncate text-xs text-muted-foreground">
                {t("adminSuporte.emailHint")}
              </p>
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
              <p className="truncate text-sm font-bold">{t("adminSuporte.whatsapp")}</p>
              <p className="truncate text-xs text-muted-foreground">
                {t("adminSuporte.whatsappHint")}
              </p>
            </div>
          </a>
        </div>

        <form onSubmit={handleSubmit} className="card-soft mt-6 space-y-4 p-6">
          <h2 className="font-display text-base font-bold text-foreground">
            {t("adminSuporte.formTitle")}
          </h2>

          <div className="space-y-1.5">
            <Label htmlFor="support-restaurant">{t("adminSuporte.restaurantLabel")}</Label>
            <Input id="support-restaurant" value={restaurant.name} disabled />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="support-subject">{t("adminSuporte.subjectLabel")}</Label>
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
            <Label htmlFor="support-message">{t("adminSuporte.messageLabel")}</Label>
            <Textarea
              id="support-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("adminSuporte.messagePlaceholder")}
              className="min-h-32 rounded-xl"
            />
          </div>

          <Button type="submit" className="w-full rounded-xl">
            <Send className="h-4 w-4" /> {t("adminSuporte.submit")}
          </Button>
        </form>
      </div>
    </div>
  );
}
