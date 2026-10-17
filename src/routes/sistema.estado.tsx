import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, BellRing, CheckCircle2, ExternalLink, RefreshCw, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { KpiTile } from "@/components/admin-stats";
import { SystemPageHeading } from "@/components/system-shell";
import {
  fetchSystemStatus,
  resolveIncident,
  runSystemHealthChecks,
  updateIncidentCause,
  type HealthCheckResult,
  type SystemIncident,
} from "@/data/api-status";
import { useTranslation } from "@/i18n";
import { formatStatusDateTime } from "@/lib/status-format";
import { useSystemAdmin } from "@/lib/system-admin";

export const Route = createFileRoute("/sistema/estado")({
  head: () => ({ meta: [{ title: "Estado — Sistema Luku.com" }] }),
  component: SistemaEstado,
});

/** Incidentes com o erro técnico + verificações em tempo real. A página
 * pública (/estado) nunca mostra nada disto. */
function SistemaEstado() {
  const { t, locale } = useTranslation();
  const { token } = useSystemAdmin();
  const [incidents, setIncidents] = useState<SystemIncident[]>([]);
  const [subscribers, setSubscribers] = useState(0);
  const [checks, setChecks] = useState<Record<string, HealthCheckResult> | null>(null);
  const [checking, setChecking] = useState(false);

  const load = useCallback(() => {
    if (!token) return;
    fetchSystemStatus(token)
      .then((data) => {
        setIncidents(data.incidents);
        setSubscribers(data.subscribers);
      })
      .catch(() => toast.error(t("sistemaEstado.loadError")));
  }, [token, t]);

  const check = useCallback(() => {
    if (!token) return;
    setChecking(true);
    runSystemHealthChecks(token)
      .then(setChecks)
      .catch(() => toast.error(t("sistemaEstado.checkError")))
      .finally(() => setChecking(false));
  }, [token, t]);

  useEffect(() => {
    load();
    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const open = incidents.filter((i) => i.status !== "resolved");

  return (
    <div className="pb-16">
      <SystemPageHeading
        eyebrow={t("sistemaEstado.eyebrow")}
        title={t("sistemaEstado.title")}
        description={t("sistemaEstado.description")}
      />

      <div className="mx-auto mt-6 max-w-4xl space-y-6 px-4 md:px-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <KpiTile
            icon={Activity}
            tone={open.length > 0 ? "brand" : "success"}
            big={false}
            label={t("sistemaEstado.openIncidents")}
            value={String(open.length)}
            hint={t("sistemaEstado.openHint")}
          />
          <KpiTile
            icon={BellRing}
            tone="brand"
            big={false}
            label={t("sistemaEstado.subscribers")}
            value={String(subscribers)}
            hint={t("sistemaEstado.subscribersHint")}
          />
        </div>

        <section className="rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between gap-3 border-b border-border p-4">
            <h2 className="text-base font-bold">{t("sistemaEstado.checksTitle")}</h2>
            <div className="flex items-center gap-2">
              <Link
                to="/estado"
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-primary hover:bg-surface"
              >
                {t("sistemaEstado.publicPage")} <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </Link>
              <button
                type="button"
                onClick={check}
                disabled={checking}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${checking ? "animate-spin" : ""}`}
                  aria-hidden
                />
                {t("sistemaEstado.checkNow")}
              </button>
            </div>
          </div>
          {checks ? (
            <ul className="divide-y divide-border">
              {Object.entries(checks).map(([name, r]) => (
                <li key={name} className="flex items-start gap-3 p-4">
                  {r.ok ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{t(`sistemaEstado.checks.${name}`)}</p>
                    {r.error && (
                      <p className="mt-1 break-words font-mono text-xs text-destructive">
                        {r.error}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {r.ms} ms
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-4 text-sm text-muted-foreground">{t("sistemaEstado.checking")}</p>
          )}
        </section>

        <section>
          <h2 className="text-base font-bold">{t("sistemaEstado.incidentsTitle")}</h2>
          {incidents.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              {t("sistemaEstado.noIncidents")}
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {incidents.map((incident) => (
                <IncidentCard
                  key={incident.id}
                  incident={incident}
                  token={token}
                  onChanged={load}
                  when={formatStatusDateTime(incident.startedAt, locale)}
                  until={
                    incident.resolvedAt ? formatStatusDateTime(incident.resolvedAt, locale) : null
                  }
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function IncidentCard({
  incident,
  token,
  onChanged,
  when,
  until,
}: {
  incident: SystemIncident;
  token: string | null;
  onChanged: () => void;
  when: string;
  until: string | null;
}) {
  const { t } = useTranslation();
  const [cause, setCause] = useState(incident.publicCause ?? "");
  const [saving, setSaving] = useState(false);
  const resolved = incident.status === "resolved";

  const save = async () => {
    if (!token) return;
    setSaving(true);
    try {
      await updateIncidentCause(incident.id, cause.trim(), token);
      toast.success(t("sistemaEstado.causeSaved"));
      onChanged();
    } catch {
      toast.error(t("sistemaEstado.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const resolve = async () => {
    if (!token) return;
    setSaving(true);
    try {
      await resolveIncident(incident.id, token);
      toast.success(t("sistemaEstado.resolvedToast"));
      onChanged();
    } catch {
      toast.error(t("sistemaEstado.saveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">
          {incident.components.map((c) => t(`status.components.${c}`)).join(", ")}
        </p>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            resolved ? "bg-success/10 text-success" : "bg-amber-100 text-amber-900"
          }`}
        >
          {t(`sistemaEstado.incidentStatus.${incident.status}`)}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {until ? `${when} → ${until}` : when}
        {" · "}
        {incident.usersNotifiedAt
          ? t("sistemaEstado.usersNotified")
          : t("sistemaEstado.usersNotNotified")}
      </p>

      {incident.internalError && (
        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-surface p-3 font-mono text-xs text-destructive">
          {incident.internalError}
        </pre>
      )}

      <label
        className="mt-3 block text-xs font-semibold text-muted-foreground"
        htmlFor={`cause-${incident.id}`}
      >
        {t("sistemaEstado.causeLabel")}
      </label>
      <div className="mt-1 flex flex-col gap-2 sm:flex-row">
        <input
          id={`cause-${incident.id}`}
          value={cause}
          onChange={(e) => setCause(e.target.value)}
          maxLength={160}
          placeholder={incident.defaultCause}
          className="w-full min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-surface disabled:opacity-60"
        >
          {t("sistemaEstado.saveCause")}
        </button>
        {!resolved && (
          <button
            type="button"
            onClick={resolve}
            disabled={saving}
            className="rounded-xl bg-success px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {t("sistemaEstado.resolve")}
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{t("sistemaEstado.causeHint")}</p>
    </li>
  );
}
