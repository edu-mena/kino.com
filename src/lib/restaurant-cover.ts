/**
 * Capa para restaurantes que ainda não carregaram uma foto: cor e ícones do
 * tipo de cozinha + as iniciais do restaurante ao centro (servem também de
 * "logótipo" nos avatares redondos, que recortam o centro da capa). Antes
 * era a MESMA foto genérica de um restaurante para todos — repetitiva e
 * enganadora (parecia o espaço real).
 *
 * SVG gerado no cliente como data URI (sem pedido de rede, nunca passa pelo
 * CDN de imagens — ver image-cdn.ts).
 */

type Theme = { from: string; to: string; icon: string };

const ICONS = {
  fish: '<path d="M2 12c3-5 9-6 14-3l4-3v12l-4-3c-5 3-11 2-14-3z"/><circle cx="7" cy="11" r="1"/>',
  flame: '<path d="M12 2c1 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-4 2-7 2 1 3 3 3 5 1-3 0-6 1-9z"/>',
  pizza:
    '<path d="M12 2 2 20h20L12 2z"/><path d="M5 15c4 2 10 2 14 0"/><circle cx="12" cy="11" r="1"/><circle cx="10" cy="16" r="1"/><circle cx="14.5" cy="15.5" r="1"/>',
  cup: '<path d="M4 8h13v5a6 6 0 0 1-12 0V8zM17 9h2a2 2 0 0 1 0 4h-2M8 2v3M12 2v3"/>',
  burger: '<path d="M4 10a8 6 0 0 1 16 0H4zM3 13h18M4 16h16a2 2 0 0 1-2 3H6a2 2 0 0 1-2-3z"/>',
  glass: '<path d="M7 3h10l-1 8a4 4 0 0 1-8 0L7 3zM12 15v5M8 20h8"/>',
  plate: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M2 5v6M22 5v14"/>',
};

const THEMES: { match: RegExp; theme: Theme }[] = [
  {
    match: /maris[cq]|peixe|\bmar\b|sushi|japon/i,
    theme: { from: "#0E5E6F", to: "#1B8A9A", icon: ICONS.fish },
  },
  {
    match: /grelh|churras|brasa|rod[ií]zio|picanha|carne|steak/i,
    theme: { from: "#7A1F1F", to: "#B23A2A", icon: ICONS.flame },
  },
  { match: /ital|pizz|massa|pasta/i, theme: { from: "#8C2F1B", to: "#C8553D", icon: ICONS.pizza } },
  {
    match: /caf[eé]|pastel|doce|padaria|bolo|gelat|sobremesa|snack/i,
    theme: { from: "#6B4226", to: "#A0703F", icon: ICONS.cup },
  },
  {
    match: /hamb[uú]rg|burger|fast|lanche|frango/i,
    theme: { from: "#B5651D", to: "#E09F3E", icon: ICONS.burger },
  },
  {
    match: /bar\b|lounge|petisc|tasca|cocktail/i,
    theme: { from: "#4B2E5C", to: "#7A4F8F", icon: ICONS.glass },
  },
  { match: /brasil/i, theme: { from: "#1F6B3A", to: "#3C9D5D", icon: ICONS.flame } },
];

/** Verde Luku — angolana/típica e tudo o que não encaixa acima. */
const DEFAULT_THEME: Theme = { from: "#1F4D3A", to: "#2F6E52", icon: ICONS.plate };

const STOP_WORDS = new Set([
  "de",
  "do",
  "da",
  "dos",
  "das",
  "e",
  "o",
  "a",
  "&",
  "restaurante",
  "the",
]);

export function restaurantInitials(name: string): string {
  const words = name
    .replace(/['’]/g, "")
    .split(/\s+/)
    .filter((w) => w && !STOP_WORDS.has(w.toLowerCase()));
  const letters = (words.length > 0 ? words : [name]).slice(0, 2).map((w) => w.charAt(0));
  return letters.join("").toUpperCase() || "L";
}

/** A cozinha manda; o nome só ajuda quando a cozinha é vaga ("Restaurante",
 * "outro") — senão a "Tasca do Mestre Zé" (angolana) virava um bar. */
function themeFor(name: string, cuisine: string): Theme {
  return (
    THEMES.find((t) => t.match.test(cuisine))?.theme ??
    (/angol|t[ií]pic|tradicion/i.test(cuisine)
      ? undefined
      : THEMES.find((t) => t.match.test(name))?.theme) ??
    DEFAULT_THEME
  );
}

const escapeXml = (s: string) =>
  s.replace(
    /[<>&"']/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!,
  );

/** Data URI de uma capa 1200×675 para o restaurante. Determinística. */
export function generatedRestaurantCover(name: string, cuisine: string): string {
  const theme = themeFor(name, cuisine);
  const initials = escapeXml(restaurantInitials(name));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${theme.from}"/><stop offset="1" stop-color="${theme.to}"/></linearGradient><pattern id="p" width="150" height="150" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)"><g transform="translate(51 51) scale(2)" fill="none" stroke="#fff" stroke-opacity=".14" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${theme.icon}</g></pattern></defs><rect width="1200" height="675" fill="url(#g)"/><rect width="1200" height="675" fill="url(#p)"/><circle cx="600" cy="337" r="132" fill="#fff" fill-opacity=".16"/><circle cx="600" cy="337" r="106" fill="#fff" fill-opacity=".94"/><text x="600" y="337" dy=".35em" text-anchor="middle" font-family="Outfit, 'DM Sans', Arial, sans-serif" font-weight="800" font-size="92" fill="${theme.from}">${initials}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
