import type { Locale } from "@/i18n";

/** Locale BCP-47 para `toLocaleDateString` nas páginas do painel. */
export const BCP47: Record<Locale, string> = { pt: "pt-PT", en: "en-GB", fr: "fr-FR" };

/** Segunda-feira 00:00 da semana de `d` — base dos baldes semanais dos gráficos. */
export function weekStart(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

/** Últimas 8 semanas (segunda a segunda), da mais antiga para a mais recente,
 * relativas a `ref` (por omissão, agora). */
export function last8Weeks(ref: Date = new Date()) {
  const anchor = weekStart(ref);
  return Array.from({ length: 8 }, (_, i) => {
    const start = new Date(anchor);
    start.setDate(start.getDate() - (7 - i) * 7);
    return start;
  });
}
