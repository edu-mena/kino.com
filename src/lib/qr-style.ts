/**
 * Estilo dos cartões QR impressos (estúdio em `/admin/mesas`, separador
 * "Códigos QR"). Guardado no restaurante (`PUT /restaurants/{id}/qr-style`)
 * para que a reimpressão de uma mesa saia igual às outras, em qualquer
 * dispositivo. Chaves alinhadas com `UpdateQrStyleRequest::KEYS`.
 */

/** Modelo visual. */
export type QrTemplate = "classic" | "bold" | "minimal" | "dark";
/** Formato físico — dita o tamanho do cartão e quantos cabem numa A4. */
export type QrFormat = "card" | "tent" | "sticker" | "mini";

export type QrStyle = {
  template: QrTemplate;
  format: QrFormat;
  /** Cor de destaque, #RRGGBB. */
  color: string;
  showLogo: boolean;
  /** Logótipo também ao centro do próprio QR. */
  logoInQr: boolean;
  showTable: boolean;
  showName: boolean;
  /** Selo "Peça com a Luku" — é por aqui que quem lê o QR conhece a Luku. */
  showLuku: boolean;
  /** Frase principal; vazio = texto por omissão da língua. */
  headline: string;
  /** Linha pequena opcional (ex.: "Peça ao balcão se preferir"). */
  footnote: string;
  wifiName: string;
  wifiPassword: string;
};

export const QR_TEMPLATES: QrTemplate[] = ["classic", "bold", "minimal", "dark"];
export const QR_FORMATS: QrFormat[] = ["card", "tent", "sticker", "mini"];

/** Uma paleta curta de cores que imprimem bem (a 1.ª é a omissão). */
export const QR_COLOR_PRESETS = [
  // Laranja e verde Luku.
  "#E8730C",
  "#1F4D2E",
  "#1D3557",
  "#9D174D",
  "#7C2D12",
  "#111827",
  "#B45309",
  "#0E7490",
];

export const DEFAULT_QR_STYLE: QrStyle = {
  template: "classic",
  format: "card",
  color: QR_COLOR_PRESETS[0]!,
  showLogo: true,
  logoInQr: false,
  showTable: true,
  showName: true,
  showLuku: true,
  headline: "",
  footnote: "",
  wifiName: "",
  wifiPassword: "",
};

/** Mistura o que veio da API (pode ter chaves em falta ou inválidas) com os
 * valores por omissão. */
export function normalizeQrStyle(raw: unknown): QrStyle {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const str = (k: keyof QrStyle, max: number) =>
    typeof r[k] === "string" ? (r[k] as string).slice(0, max) : (DEFAULT_QR_STYLE[k] as string);
  const bool = (k: keyof QrStyle) =>
    typeof r[k] === "boolean" ? (r[k] as boolean) : (DEFAULT_QR_STYLE[k] as boolean);
  return {
    template: QR_TEMPLATES.includes(r["template"] as QrTemplate)
      ? (r["template"] as QrTemplate)
      : DEFAULT_QR_STYLE.template,
    format: QR_FORMATS.includes(r["format"] as QrFormat)
      ? (r["format"] as QrFormat)
      : DEFAULT_QR_STYLE.format,
    color:
      typeof r["color"] === "string" && /^#[0-9a-f]{6}$/i.test(r["color"])
        ? r["color"]
        : DEFAULT_QR_STYLE.color,
    showLogo: bool("showLogo"),
    logoInQr: bool("logoInQr"),
    showTable: bool("showTable"),
    showName: bool("showName"),
    showLuku: bool("showLuku"),
    headline: str("headline", 80),
    footnote: str("footnote", 120),
    wifiName: str("wifiName", 60),
    wifiPassword: str("wifiPassword", 60),
  };
}

/** Tamanho físico de cada formato, em mm (largura × altura). */
export const QR_FORMAT_SIZE_MM: Record<QrFormat, { w: number; h: number }> = {
  // A6 em pé — o clássico cartão de mesa / acrílico.
  card: { w: 105, h: 148 },
  // Display dobrável: A4 deitada ao meio — cada face é 210 × 148,5.
  tent: { w: 210, h: 148.5 },
  // Autocolante redondo de 8 cm.
  sticker: { w: 80, h: 80 },
  // Cartão de visita / autocolante de canto de mesa.
  mini: { w: 85, h: 55 },
};

/** Quantos cartões de cada formato cabem numa A4 (210 × 297) com margem de
 * corte — colunas × linhas. */
export const QR_SHEET_GRID: Record<QrFormat, { cols: number; rows: number }> = {
  card: { cols: 2, rows: 2 },
  tent: { cols: 1, rows: 1 },
  sticker: { cols: 2, rows: 3 },
  mini: { cols: 2, rows: 5 },
};

/** Luminância relativa (WCAG) de #RRGGBB. */
export function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!;
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Cor dos módulos do QR: a cor da marca só se tiver contraste de sobra com
 * o branco (câmaras baratas e luz de restaurante não perdoam); senão,
 * quase-preto. */
export function qrModuleColor(color: string): string {
  return contrastRatio(color, "#ffffff") >= 7 ? color : "#111111";
}

/** Texto legível por cima de `color` (branco ou quase-preto). */
export function onColor(color: string): string {
  return contrastRatio(color, "#ffffff") >= 3 ? "#ffffff" : "#111111";
}
