import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Mail, MessageCircle, Phone, Send } from "lucide-react";
import { useMemo, useState } from "react";
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
import { createTicket, getTickets } from "@/data/support-tickets-store";
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
  const [refreshTick, setRefreshTick] = useState(0);
  const { t } = useTranslation();

  const myTickets = useMemo(
    () => (restaurant ? getTickets().filter((tk) => tk.restaurantId === restaurant.id) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [restaurant, refreshTick],
  );

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
    createTicket({
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      subject: subjectLabel,
      message: message.trim(),
    });
    setRefreshTick((n) => n + 1);
    const body = `${message}\n\n— ${restaurant.name}`;
    const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
      `[Painel Kino] ${subjectLabel}`,
    )}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    toast.success(t("adminSuporte.ticketSentToast"));
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

        {myTickets.length > 0 && (
          <div className="card-soft mt-6 p-6">
            <h2 className="font-display text-base font-bold text-foreground">
              {t("adminSuporte.myTicketsTitle")}
            </h2>
            <ul className="mt-3 space-y-2">
              {myTickets.map((tk) => (
                <li key={tk.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground">{tk.subject}</span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        tk.status === "resolved"
                          ? "bg-success/15 text-success"
                          : "bg-brand/15 text-brand"
                      }`}
                    >
                      {tk.status === "resolved"
                        ? t("adminSuporte.statusResolved")
                        : t("adminSuporte.statusOpen")}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{tk.message}</p>
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3" />
                    {new Date(tk.createdAt).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
