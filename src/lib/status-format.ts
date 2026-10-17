import type { Locale } from "@/i18n";
import { BCP47 } from "@/lib/week";

/** Hora de Luanda — a mesma dos emails/push de incidente (backend
 * IncidentMessages::TIMEZONE), seja qual for o fuso do dispositivo. */
export const STATUS_TIMEZONE = "Africa/Luanda";

type T = (path: string, vars?: Record<string, string | number>) => string;

function parts(iso: string, locale: Locale) {
  const date = new Date(iso);
  const day = new Intl.DateTimeFormat(BCP47[locale], {
    timeZone: STATUS_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
  }).format(date);
  const time = new Intl.DateTimeFormat(BCP47[locale], {
    timeZone: STATUS_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  return { day, time };
}

/** "das 18:18 às 18:33" no mesmo dia; com datas quando atravessa a meia-noite. */
export function formatIncidentPeriod(fromIso: string, toIso: string, locale: Locale, t: T): string {
  const from = parts(fromIso, locale);
  const to = parts(toIso, locale);
  return from.day === to.day
    ? t("status.periodSameDay", { from: from.time, to: to.time })
    : t("status.periodMultiDay", { from: `${from.day} ${from.time}`, to: `${to.day} ${to.time}` });
}

export function formatStatusDateTime(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(BCP47[locale], {
    timeZone: STATUS_TIMEZONE,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function formatStatusDay(date: string, locale: Locale): string {
  return new Intl.DateTimeFormat(BCP47[locale], {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T00:00:00Z`));
}

/** 99,97 (pt/fr) / 99.97 (en) — sem o "%", que vem do texto traduzido. */
export function formatPercent(value: number, locale: Locale): string {
  return new Intl.NumberFormat(BCP47[locale], {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
