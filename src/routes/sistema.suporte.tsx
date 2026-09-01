import { createFileRoute } from "@tanstack/react-router";
import { Check, LifeBuoy } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ADMIN_FILTER_SELECT, KpiTile } from "@/components/admin-stats";
import { SystemPageHeading } from "@/components/system-shell";
import { getTickets, setTicketStatus } from "@/data/support-tickets-store";
import { useTranslation } from "@/i18n";
import { BCP47 } from "@/lib/week";

export const Route = createFileRoute("/sistema/suporte")({
  head: () => ({ meta: [{ title: "Suporte — Sistema Kino.com" }] }),
  component: SistemaSuporte,
});

function SistemaSuporte() {
  const { t, locale } = useTranslation();
  const [tick, setTick] = useState(0);
  const [filter, setFilter] = useState<"open" | "resolved" | "todos">("open");

  const tickets = useMemo(
    () => getTickets(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick],
  );
  const openCount = tickets.filter((tk) => tk.status === "open").length;
  const list = tickets.filter((tk) => filter === "todos" || tk.status === filter);

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(BCP47[locale], {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="pb-16">
      <SystemPageHeading
        eyebrow={t("sistemaSuporte.eyebrow")}
        title={t("sistemaSuporte.title")}
        description={t("sistemaSuporte.description")}
      />

      <div className="mx-auto mt-6 max-w-4xl px-4 md:px-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <KpiTile
            icon={LifeBuoy}
            tone="brand"
            big={false}
            label={t("sistemaSuporte.openTickets")}
            value={String(openCount)}
            hint={t("sistemaSuporte.openHint")}
          />
          <KpiTile
            icon={Check}
            tone="success"
            big={false}
            label={t("sistemaSuporte.resolvedTickets")}
            value={String(tickets.length - openCount)}
            hint={t("sistemaSuporte.resolvedHint")}
          />
        </div>

        <div className="mt-6 flex justify-end">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className={ADMIN_FILTER_SELECT}
          >
            <option value="open">{t("sistemaSuporte.filterOpen")}</option>
            <option value="resolved">{t("sistemaSuporte.filterResolved")}</option>
            <option value="todos">{t("sistemaSuporte.filterAll")}</option>
          </select>
        </div>

        <div className="mt-3 space-y-2">
          {list.length === 0 ? (
            <div className="card-soft grid place-items-center gap-3 p-10 text-center">
              <LifeBuoy className="h-9 w-9 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("sistemaSuporte.empty")}</p>
            </div>
          ) : (
            list.map((tk) => (
              <div key={tk.id} className="card-soft p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">
                      {tk.restaurantName} · {tk.subject}
                    </p>
                    <p className="text-xs text-muted-foreground">{fmt(tk.createdAt)}</p>
                  </div>
                  {tk.status === "open" ? (
                    <button
                      type="button"
                      onClick={() => {
                        setTicketStatus(tk.id, "resolved");
                        setTick((n) => n + 1);
                        toast.success(t("sistemaSuporte.resolvedToast"));
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
                    >
                      <Check className="h-3.5 w-3.5" /> {t("sistemaSuporte.markResolved")}
                    </button>
                  ) : (
                    <span className="rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-bold text-success">
                      {t("sistemaSuporte.resolved")}
                    </span>
                  )}
                </div>
                <p className="mt-2 rounded-lg bg-surface p-3 text-sm text-foreground">
                  {tk.message}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
