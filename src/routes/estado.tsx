import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, BellRing, CheckCircle2, HeartHandshake, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import icon from "@/assets/icon.png";
import { PageHeading, PageShell, SiteHeader } from "@/components/site-shell";
import {
  cancelStatusSubscription,
  confirmStatusSubscription,
  fetchServiceStatus,
  subscribeToStatus,
  type ServiceStatus,
  type StatusComponent,
  type StatusIncident,
} from "@/data/api-status";
import { useTranslation } from "@/i18n";
import { hasRealBackend } from "@/lib/api-client";
import {
  formatIncidentPeriod,
  formatPercent,
  formatStatusDateTime,
  formatStatusDay,
} from "@/lib/status-format";

type EstadoSearch = { confirmar?: string | undefined; cancelar?: string | undefined };

export const Route = createFileRoute("/estado")({
  validateSearch: (s: Record<string, unknown>): EstadoSearch => ({
    confirmar: typeof s["confirmar"] === "string" ? s["confirmar"] : undefined,
    cancelar: typeof s["cancelar"] === "string" ? s["cancelar"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Estado dos serviços — Luku.com" },
      {
        name: "description",
        content:
          "Estado em tempo real dos serviços da Luku: cardápios, pedidos, reservas e notificações.",
      },
      { property: "og:title", content: "Estado dos serviços — Luku.com" },
      { property: "og:image", content: icon },
    ],
  }),
  component: Estado,
});

const REFRESH_MS = 60_000;

function Estado() {
  const { t } = useTranslation();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [status, setStatus] = useState<ServiceStatus | null>(null);
  const [unreachable, setUnreachable] = useState(false);

  const load = useCallback(() => {
    fetchServiceStatus()
      .then((data) => {
        setStatus(data);
        setUnreachable(false);
      })
      .catch(() => setUnreachable(true));
  }, []);

  useEffect(() => {
    if (!hasRealBackend) return;
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  // Links do email: confirmar / deixar de receber os avisos.
  useEffect(() => {
    const token = search.confirmar ?? search.cancelar;
    if (!token || !hasRealBackend) return;
    const action = search.confirmar ? confirmStatusSubscription : cancelStatusSubscription;
    action(token)
      .then(() =>
        toast.success(
          t(search.confirmar ? "status.subscribe.confirmed" : "status.subscribe.cancelled"),
        ),
      )
      .catch(() => toast.error(t("status.subscribe.invalidLink")))
      .finally(() => navigate({ to: "/estado", search: {}, replace: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.confirmar, search.cancelar]);

  const overall = unreachable ? "incident" : (status?.status ?? null);

  return (
    <PageShell header={<SiteHeader variant="guestHome" />} footer={null} showMobileTabBar={false}>
      <PageHeading
        eyebrow={t("status.eyebrow")}
        title={t("status.title")}
        description={t("status.description")}
      />

      <div className="mx-auto mt-8 max-w-4xl space-y-8 px-4 pb-16 md:px-6">
        <OverallCard overall={overall} generatedAt={status?.generatedAt ?? null} onRefresh={load} />

        {status?.activeIncident && <ActiveIncident incident={status.activeIncident} />}

        <section
          aria-labelledby="status-components"
          className="rounded-2xl border border-border bg-card"
        >
          <div className="flex items-baseline justify-between gap-3 border-b border-border p-4">
            <h2 id="status-components" className="text-base font-bold">
              {t("status.componentsTitle")}
            </h2>
            <span className="text-xs text-muted-foreground">{t("status.last90Days")}</span>
          </div>
          {status ? (
            <ul className="divide-y divide-border">
              {status.components.map((c) => (
                <ComponentRow key={c.key} component={c} />
              ))}
            </ul>
          ) : (
            <p className="p-4 text-sm text-muted-foreground">
              {unreachable ? t("status.unreachable") : t("status.loading")}
            </p>
          )}
          <Legend />
        </section>

        <section aria-labelledby="status-history">
          <h2 id="status-history" className="text-base font-bold">
            {t("status.historyTitle")}
          </h2>
          {status && status.incidents.filter((i) => i.status === "resolved").length > 0 ? (
            <ul className="mt-3 space-y-3">
              {status.incidents
                .filter((i) => i.status === "resolved")
                .map((i) => (
                  <ResolvedIncident key={i.id} incident={i} />
                ))}
            </ul>
          ) : (
            <p className="mt-3 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              {t("status.noIncidents")}
            </p>
          )}
        </section>

        <SubscribeCard />

        <div className="flex items-start gap-3 rounded-2xl bg-surface p-4 text-sm text-muted-foreground">
          <HeartHandshake className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden />
          <p>{t("status.commitment")}</p>
        </div>
        <p className="text-center text-xs text-muted-foreground">{t("status.timezoneNote")}</p>
      </div>
    </PageShell>
  );
}

function OverallCard({
  overall,
  generatedAt,
  onRefresh,
}: {
  overall: ServiceStatus["status"] | null;
  generatedAt: string | null;
  onRefresh: () => void;
}) {
  const { t, locale } = useTranslation();
  const tone =
    overall === "incident"
      ? "bg-amber-600 text-white"
      : overall === "recovering"
        ? "bg-sky-600 text-white"
        : "bg-success text-white";
  const Icon = overall === "incident" ? AlertTriangle : CheckCircle2;
  const label =
    overall === null
      ? t("status.loading")
      : t(
          overall === "incident"
            ? "status.overall.incident"
            : overall === "recovering"
              ? "status.overall.recovering"
              : "status.overall.operational",
        );

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl p-5 shadow-sm ${overall === null ? "bg-surface" : tone}`}
    >
      <Icon className="h-7 w-7 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-lg font-bold leading-tight">{label}</p>
        {generatedAt && (
          <p className="mt-0.5 text-xs opacity-90">
            {t("status.updatedAt", { time: formatStatusDateTime(generatedAt, locale) })}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onRefresh}
        className="rounded-full p-2 transition-colors hover:bg-white/15"
        aria-label={t("status.refresh")}
      >
        <RefreshCw className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

function ActiveIncident({ incident }: { incident: StatusIncident }) {
  const { t, locale } = useTranslation();
  return (
    <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
      <p className="text-xs font-semibold uppercase tracking-wider">
        {t(
          incident.status === "monitoring"
            ? "status.incident.monitoring"
            : "status.incident.investigating",
        )}
        {" · "}
        {t("status.incident.since", { time: formatStatusDateTime(incident.startedAt, locale) })}
      </p>
      <h2 className="mt-2 text-lg font-bold">{t("status.banner.incidentTitle")}</h2>
      <p className="mt-1 text-sm leading-relaxed">{t("status.banner.incidentBody")}</p>
      <p className="mt-3 text-xs">
        {t("status.incident.affected")}{" "}
        {incident.components.map((c) => t(`status.components.${c}`)).join(", ")}
      </p>
    </section>
  );
}

function ResolvedIncident({ incident }: { incident: StatusIncident }) {
  const { t, locale } = useTranslation();
  return (
    <li className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">
        {formatStatusDateTime(incident.startedAt, locale)} ·{" "}
        {incident.components.map((c) => t(`status.components.${c}`)).join(", ")}
      </p>
      <p className="mt-1 text-sm font-semibold">{t("status.banner.resolvedTitle")}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("status.banner.resolvedBody", {
          period: formatIncidentPeriod(
            incident.startedAt,
            incident.resolvedAt ?? incident.startedAt,
            locale,
            t,
          ),
          cause: incident.cause ?? "",
        })}
      </p>
    </li>
  );
}

function dayColor(uptime: number | null): string {
  if (uptime === null) return "bg-muted";
  if (uptime >= 99.5) return "bg-success";
  if (uptime >= 95) return "bg-amber-500";
  return "bg-destructive";
}

function ComponentRow({ component }: { component: StatusComponent }) {
  const { t, locale } = useTranslation();
  const badge =
    component.status === "outage"
      ? {
          cls: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
          key: "status.componentStatus.outage",
        }
      : component.status === "recovering"
        ? {
            cls: "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100",
            key: "status.componentStatus.recovering",
          }
        : { cls: "bg-success/10 text-success", key: "status.componentStatus.operational" };

  return (
    <li className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{t(`status.components.${component.key}`)}</p>
          <p className="text-xs text-muted-foreground">
            {t(`status.componentHints.${component.key}`)}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge.cls}`}>
          {t(badge.key)}
        </span>
      </div>
      <div className="mt-3 flex h-8 items-stretch gap-[2px]" aria-hidden>
        {component.days.map((d) => (
          <span
            key={d.date}
            title={`${formatStatusDay(d.date, locale)} · ${
              d.uptime === null ? t("status.noData") : `${formatPercent(d.uptime, locale)}%`
            }`}
            className={`min-w-0 flex-1 rounded-[2px] ${dayColor(d.uptime)}`}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
        <span>{t("status.daysAgo", { days: component.days.length })}</span>
        <span>
          {component.uptime === null
            ? t("status.noData")
            : t("status.uptime", { value: formatPercent(component.uptime, locale) })}
        </span>
        <span>{t("status.today")}</span>
      </div>
    </li>
  );
}

function Legend() {
  const { t } = useTranslation();
  const items = [
    { cls: "bg-success", key: "status.legend.ok" },
    { cls: "bg-amber-500", key: "status.legend.partial" },
    { cls: "bg-destructive", key: "status.legend.outage" },
    { cls: "bg-muted", key: "status.legend.noData" },
  ];
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border p-4 text-xs text-muted-foreground">
      {items.map((i) => (
        <span key={i.key} className="inline-flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-sm ${i.cls}`} aria-hidden />
          {t(i.key)}
        </span>
      ))}
    </div>
  );
}

function SubscribeCard() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    try {
      await subscribeToStatus(email.trim());
      setDone(true);
    } catch {
      toast.error(t("status.subscribe.error"));
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold">{t("status.subscribe.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("status.subscribe.description")}</p>
          {done ? (
            <p className="mt-3 rounded-xl bg-success/10 p-3 text-sm font-medium text-success">
              {t("status.subscribe.checkEmail")}
            </p>
          ) : (
            <form onSubmit={submit} className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("status.subscribe.placeholder")}
                aria-label={t("status.subscribe.placeholder")}
                className="w-full min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={sending}
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {sending ? t("status.subscribe.sending") : t("status.subscribe.submit")}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
