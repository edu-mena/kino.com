import type { DayHours, WeeklyHours } from "@/data/types";
import type { Locale } from "@/i18n";

/**
 * Horário de funcionamento estruturado. Índice 0 = segunda-feira.
 * Um intervalo cujo `end` <= `start` fecha depois da meia-noite (conta para
 * o dia seguinte).
 */

const DAY_LABELS: Record<Locale, string[]> = {
  pt: ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"],
  en: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  fr: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"],
};

const toMin = (hhmm: string) => {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** Segunda = 0 … Domingo = 6 (JS `getDay()` tem domingo = 0). */
export const weekdayIndex = (d: Date) => (d.getDay() + 6) % 7;

export function defaultWeeklyHours(): WeeklyHours {
  return Array.from({ length: 7 }, () => ({
    open: true,
    ranges: [{ start: "11:00", end: "23:00" }],
  }));
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Horário-semente determinístico: quase todos abertos 11:00–23:00, com um
 * dia de descanso que varia por restaurante. */
export function seedHoursFor(restaurantId: string): WeeklyHours {
  const h = hash(restaurantId);
  const closedDay = h % 4 === 0 ? h % 7 : -1; // ~1/4 dos restaurantes fecha um dia
  const lunchOnly = h % 5 === 0; // alguns só almoço + jantar separados
  return Array.from({ length: 7 }, (_, i): DayHours => {
    if (i === closedDay) return { open: false, ranges: [] };
    return {
      open: true,
      ranges: lunchOnly
        ? [
            { start: "12:00", end: "15:00" },
            { start: "19:00", end: "23:00" },
          ]
        : [{ start: "11:00", end: "23:00" }],
    };
  });
}

/** Está aberto no instante `at`? Considera intervalos que passam da meia-noite. */
export function isOpenNow(hours: WeeklyHours, at: Date = new Date()): boolean {
  const day = weekdayIndex(at);
  const prevDay = (day + 6) % 7;
  const now = at.getHours() * 60 + at.getMinutes();

  const today = hours[day];
  const yesterday = hours[prevDay];

  // Intervalo de hoje: normal (start < end) cobre só hoje; um que "vira a
  // noite" (end <= start) está aberto tanto depois de `start` (esta noite)
  // como antes de `end` (madrugada).
  const openByToday =
    !!today?.open &&
    today.ranges.some((r) => {
      const s = toMin(r.start);
      const e = toMin(r.end);
      return e > s ? now >= s && now < e : now >= s || now < e;
    });

  // Cauda de um intervalo de ontem que virou a noite — a parte "normal" de
  // ontem nunca se estende a hoje, só a que passa da meia-noite conta.
  const openByYesterdayTail =
    !!yesterday?.open &&
    yesterday.ranges.some((r) => {
      const s = toMin(r.start);
      const e = toMin(r.end);
      return e <= s && now < e;
    });

  return openByToday || openByYesterdayTail;
}

/** Próxima abertura a partir de `at` → "19:00" (hoje) ou "Seg 11:00". */
export function nextOpenAt(
  hours: WeeklyHours,
  locale: Locale = "pt",
  at: Date = new Date(),
): string | undefined {
  const startMinutes = at.getHours() * 60 + at.getMinutes();
  for (let offset = 0; offset < 8; offset += 1) {
    const dayIdx = (weekdayIndex(at) + offset) % 7;
    const d = hours[dayIdx];
    if (!d || !d.open || d.ranges.length === 0) continue;
    const starts = d.ranges
      .map((r) => toMin(r.start))
      .filter((s) => offset > 0 || s > startMinutes)
      .sort((a, b) => a - b);
    if (starts.length === 0) continue;
    const first = starts[0]!;
    const hhmm = `${String(Math.floor(first / 60)).padStart(2, "0")}:${String(first % 60).padStart(2, "0")}`;
    if (offset === 0) return hhmm;
    if (offset === 1) return `${DAY_LABELS[locale][dayIdx]!.slice(0, 3)} ${hhmm}`;
    return `${DAY_LABELS[locale][dayIdx]} ${hhmm}`;
  }
  return undefined;
}

/** String humana do horário semanal, agrupando dias iguais. */
export function formatWeeklyHours(hours: WeeklyHours, locale: Locale = "pt"): string {
  const labels = DAY_LABELS[locale];
  const sig = (d: DayHours) =>
    d.open ? d.ranges.map((r) => `${r.start}-${r.end}`).join(", ") : "×";
  const parts: string[] = [];
  let i = 0;
  while (i < 7) {
    const s = sig(hours[i]!);
    let j = i;
    while (j + 1 < 7 && sig(hours[j + 1]!) === s) j += 1;
    const range =
      i === j ? labels[i]!.slice(0, 3) : `${labels[i]!.slice(0, 3)}–${labels[j]!.slice(0, 3)}`;
    const closedWord = locale === "en" ? "closed" : locale === "fr" ? "fermé" : "fechado";
    parts.push(`${range}: ${s === "×" ? closedWord : s.replace(/-/g, "–")}`);
    i = j + 1;
  }
  return parts.join(" · ");
}
