import { Link } from "@tanstack/react-router";
import { AlertTriangle, PartyPopper, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { fetchServiceStatus, type StatusIncident } from "@/data/api-status";
import { useTranslation } from "@/i18n";
import { ApiError, hasRealBackend } from "@/lib/api-client";
import { formatIncidentPeriod } from "@/lib/status-format";

const POLL_MS = 60_000;
const POLL_FAILING_MS = 30_000;
/** Quanto tempo depois da resolução o "Depois dos anjos…" continua visível. */
const RESOLVED_VISIBLE_MS = 2 * 60 * 60 * 1000;
const SEEN_KEY = "luku:incidents-seen";
const DISMISSED_KEY = "luku:incidents-dismissed";

function readIds(key: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function addId(key: string, id: string) {
  try {
    const ids = readIds(key).filter((x) => x !== id);
    localStorage.setItem(key, JSON.stringify([...ids, id].slice(-20)));
  } catch {
    // modo privado / storage bloqueado — a faixa só volta a aparecer
  }
}

type BannerState =
  | { kind: "none" }
  | { kind: "incident"; id: string }
  | { kind: "resolved"; incident: StatusIncident };

/**
 * Faixa no topo durante um incidente ("Ups, aconteceu um erro…") e, depois,
 * a mensagem de resolução ("Depois dos anjos estão os engenheiros!") — só a
 * quem chegou a ver o aviso neste browser. Também aparece sozinha quando a
 * API deixa de responder (2 falhas seguidas), porque aí nem a página de
 * estado consegue avisar. Sem rede no dispositivo é o OfflineBanner que fala.
 */
export function IncidentBanner() {
  const { t, locale } = useTranslation();
  const [state, setState] = useState<BannerState>({ kind: "none" });
  const failures = useRef(0);

  useEffect(() => {
    if (!hasRealBackend) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const poll = async () => {
      let next = POLL_MS;
      try {
        const status = await fetchServiceStatus();
        failures.current = 0;
        const active = status.activeIncident;
        const dismissed = readIds(DISMISSED_KEY);
        if (active && active.status !== "resolved") {
          addId(SEEN_KEY, active.id);
          setState(
            dismissed.includes(active.id) ? { kind: "none" } : { kind: "incident", id: active.id },
          );
        } else {
          const seen = readIds(SEEN_KEY);
          const recent = status.incidents.find(
            (i) =>
              i.status === "resolved" &&
              i.resolvedAt !== null &&
              Date.now() - new Date(i.resolvedAt).getTime() < RESOLVED_VISIBLE_MS &&
              (seen.includes(i.id) || seen.includes("unreachable")) &&
              !dismissed.includes(`${i.id}:resolved`),
          );
          setState(recent ? { kind: "resolved", incident: recent } : { kind: "none" });
        }
      } catch (error) {
        const serverDown = error instanceof ApiError && (error.status === 0 || error.status >= 500);
        if (serverDown && navigator.onLine) {
          failures.current += 1;
          if (failures.current >= 2) {
            addId(SEEN_KEY, "unreachable");
            setState(
              readIds(DISMISSED_KEY).includes("unreachable")
                ? { kind: "none" }
                : { kind: "incident", id: "unreachable" },
            );
          }
          next = POLL_FAILING_MS;
        }
      }
      if (!cancelled) timer = setTimeout(poll, next);
    };

    void poll();
    const onFocus = () => {
      if (timer) clearTimeout(timer);
      void poll();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  if (state.kind === "none") return null;

  const dismiss = () => {
    addId(DISMISSED_KEY, state.kind === "incident" ? state.id : `${state.incident.id}:resolved`);
    setState({ kind: "none" });
  };

  const incident = state.kind === "incident";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-x-0 top-0 z-[99] px-3 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] text-white shadow-md ${
        incident ? "bg-amber-600" : "bg-success"
      }`}
    >
      <div className="mx-auto flex max-w-5xl items-start gap-2 text-xs sm:text-sm">
        {incident ? (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        ) : (
          <PartyPopper className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        )}
        <p className="min-w-0 flex-1 leading-snug">
          {incident ? (
            <>
              <strong>{t("status.banner.incidentTitle")}</strong> {t("status.banner.incidentBody")}
            </>
          ) : (
            <>
              <strong>{t("status.banner.resolvedTitle")}</strong>{" "}
              {t("status.banner.resolvedBody", {
                period: formatIncidentPeriod(
                  state.incident.startedAt,
                  state.incident.resolvedAt ?? state.incident.startedAt,
                  locale,
                  t,
                ),
                cause: state.incident.cause ?? "",
              })}
            </>
          )}{" "}
          <Link to="/estado" className="font-semibold underline underline-offset-2">
            {t("status.banner.more")}
          </Link>
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="-m-1 shrink-0 rounded p-1 hover:bg-white/15"
          aria-label={t("status.banner.dismiss")}
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
