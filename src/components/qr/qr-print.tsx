import { useEffect, useMemo } from "react";
import { createPortal, flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { QrCard, type QrCardData, type QrCardLabels } from "@/components/qr/qr-card";
import { QR_FORMAT_SIZE_MM, QR_SHEET_GRID, type QrStyle } from "@/lib/qr-style";

/**
 * Impressão e exportação dos cartões QR.
 *
 * - `QrPrintSheets`: folhas A4 só para impressão (portal no `<body>`, o
 *   resto da página escondido em `@media print`). "Imprimir" → o diálogo
 *   do browser também guarda em PDF, que é o que se leva a uma gráfica.
 * - `exportQrCardPng`: um cartão em PNG a 300 dpi, para partilhar
 *   (WhatsApp, redes) — imagens e fontes embutidas no SVG antes de passar
 *   a canvas (um SVG desenhado em canvas não carrega nada externo).
 */

const PAGE = { w: 210, h: 297, margin: 5 };

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/** Escala para caber na célula da grelha (impressoras não imprimem até à
 * borda — 2 × A6 numa A4 sem margem sairia cortado). */
function cardScale(style: QrStyle): number {
  const { w, h } = QR_FORMAT_SIZE_MM[style.format];
  if (style.format === "tent") {
    return Math.min(1, (PAGE.w - PAGE.margin * 2) / w, (PAGE.h - PAGE.margin * 2) / 2 / h);
  }
  const { cols, rows } = QR_SHEET_GRID[style.format];
  const cellW = (PAGE.w - PAGE.margin * 2) / cols;
  const cellH = (PAGE.h - PAGE.margin * 2) / rows;
  return Math.min(1, cellW / w, cellH / h);
}

export function sheetCount(style: QrStyle, cards: number): number {
  if (cards === 0) return 0;
  if (style.format === "tent") return cards;
  const { cols, rows } = QR_SHEET_GRID[style.format];
  return Math.ceil(cards / (cols * rows));
}

const PRINT_CSS = `
#qr-print-root { position: fixed; left: -10000px; top: 0; opacity: 0; pointer-events: none; }
@media print {
  @page { size: A4 portrait; margin: 0; }
  html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; height: auto !important; overflow: visible !important; }
  body > *:not(#qr-print-root) { display: none !important; }
  #qr-print-root { position: static !important; opacity: 1 !important; left: auto !important; }
  .qr-sheet { break-after: page; page-break-after: always; }
  .qr-sheet:last-child { break-after: auto; page-break-after: auto; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
}
.qr-sheet { width: 210mm; height: 297mm; box-sizing: border-box; padding: 5mm; background: #fff; overflow: hidden; }
.qr-grid { display: grid; width: 100%; height: 100%; place-items: center; }
.qr-cut { outline: 0.2mm dashed #c9c4bd; outline-offset: 0.6mm; line-height: 0; }
.qr-cut-round { border-radius: 50%; }
.qr-tent { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; }
.qr-fold { width: 100%; border-top: 0.3mm dashed #9a948d; position: relative; margin: 0; }
.qr-fold span { position: absolute; right: 2mm; top: 0.8mm; font: 500 2.6mm 'DM Sans', system-ui, sans-serif; color: #9a948d; }
`;

function preloadImages(urls: string[]): Promise<void> {
  return Promise.all(
    urls.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = src;
        }),
    ),
  ).then(() => undefined);
}

export function QrPrintSheets({
  items,
  style,
  labels,
  lukuLogo,
  foldLabel,
  onDone,
}: {
  items: QrCardData[];
  style: QrStyle;
  labels: QrCardLabels;
  lukuLogo: string;
  foldLabel: string;
  onDone: () => void;
}) {
  const scale = cardScale(style);
  const { w } = QR_FORMAT_SIZE_MM[style.format];
  const widthMm = w * scale;

  const pages = useMemo(() => {
    if (style.format === "tent") return items.map((item) => [item]);
    const { cols, rows } = QR_SHEET_GRID[style.format];
    return chunk(items, cols * rows);
  }, [items, style.format]);

  useEffect(() => {
    let cancelled = false;
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      window.removeEventListener("afterprint", done);
      onDone();
    };
    const urls = Array.from(
      new Set([lukuLogo, ...items.map((i) => i.logo).filter(Boolean)] as string[]),
    );
    void preloadImages(urls).then(() => {
      if (cancelled) return;
      window.addEventListener("afterprint", done);
      // Um frame para o browser pintar as folhas antes do diálogo.
      window.setTimeout(() => {
        if (cancelled) return;
        window.print();
        // `print()` bloqueia no desktop; onde não bloqueia nem dispara
        // `afterprint` (Safari iOS), liberta o botão pouco depois.
        window.setTimeout(done, 1500);
      }, 250);
    });
    return () => {
      cancelled = true;
      window.removeEventListener("afterprint", done);
    };
    // Só ao montar — cada impressão monta um portal novo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (typeof document === "undefined") return null;

  const { cols, rows } = QR_SHEET_GRID[style.format];
  const card = (item: QrCardData, key: string, rotate = false) => (
    <div
      key={key}
      className={`qr-cut${style.format === "sticker" ? " qr-cut-round" : ""}`}
      style={rotate ? { transform: "rotate(180deg)" } : undefined}
    >
      <QrCard data={item} style={style} labels={labels} lukuLogo={lukuLogo} widthMm={widthMm} />
    </div>
  );

  return createPortal(
    <div id="qr-print-root" aria-hidden>
      <style>{PRINT_CSS}</style>
      {pages.map((page, i) =>
        style.format === "tent" ? (
          <div key={i} className="qr-sheet">
            <div className="qr-tent">
              {/* Face de cima ao contrário: dobrada, as duas leem-se direitas. */}
              {card(page[0]!, "top", true)}
              <div className="qr-fold">
                <span>{foldLabel}</span>
              </div>
              {card(page[0]!, "bottom")}
            </div>
          </div>
        ) : (
          <div key={i} className="qr-sheet">
            <div
              className="qr-grid"
              style={{
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gridTemplateRows: `repeat(${rows}, 1fr)`,
              }}
            >
              {page.map((item, j) => card(item, String(j)))}
            </div>
          </div>
        ),
      )}
    </div>,
    document.body,
  );
}

// ── PNG ──────────────────────────────────────────────────────────────────

const FONTS_CSS_URL =
  "https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap";
let fontCssPromise: Promise<string> | null = null;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** @font-face das fontes da app com os ficheiros embutidos (só os
 * subconjuntos latin/latin-ext — chega para PT/EN/FR). */
function embeddedFontCss(): Promise<string> {
  fontCssPromise ??= (async () => {
    try {
      const css = await (await fetch(FONTS_CSS_URL)).text();
      const blocks = css.split("/* ").filter((b) => /^latin(-ext)? \*\//.test(b));
      const out: string[] = [];
      for (const block of blocks) {
        const url = block.match(/url\((https:[^)]+)\)/)?.[1];
        if (!url) continue;
        const data = await blobToDataUrl(await (await fetch(url)).blob());
        out.push(block.slice(block.indexOf("@font-face")).replace(url, data));
      }
      return out.join("\n");
    } catch {
      return "";
    }
  })();
  return fontCssPromise;
}

/** Imagem → data URL (redimensionada a `maxPx`). `null` se o servidor da
 * imagem não permitir ler (CORS). */
export async function imageToDataUrl(src: string, maxPx = 700): Promise<string | null> {
  if (src.startsWith("data:")) return src;
  try {
    const res = await fetch(src, { mode: "cors" });
    if (!res.ok) return null;
    const blobUrl = URL.createObjectURL(await res.blob());
    try {
      const img = new Image();
      img.src = blobUrl;
      await img.decode();
      const scale = Math.min(1, maxPx / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/png");
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  } catch {
    return null;
  }
}

/**
 * Descarrega um cartão em PNG a 300 dpi. Devolve `"no-logo"` quando o
 * logótipo do restaurante não pôde ser embutido (servidor sem CORS) — o
 * PNG sai sem ele; a impressão/PDF não tem esse limite.
 */
export async function exportQrCardPng({
  data,
  style,
  labels,
  lukuLogo,
  filename,
}: {
  data: QrCardData;
  style: QrStyle;
  labels: QrCardLabels;
  lukuLogo: string;
  filename: string;
}): Promise<"ok" | "no-logo"> {
  const [lukuData, logoData, fontCss] = await Promise.all([
    imageToDataUrl(lukuLogo, 600),
    data.logo ? imageToDataUrl(data.logo, 700) : Promise.resolve(null),
    embeddedFontCss(),
  ]);
  const missingLogo = Boolean(data.logo && !logoData && (style.showLogo || style.logoInQr));

  const host = document.createElement("div");
  const root = createRoot(host);
  flushSync(() => {
    root.render(
      <QrCard
        data={{ ...data, logo: logoData ?? undefined }}
        style={style}
        labels={labels}
        lukuLogo={lukuData ?? lukuLogo}
      />,
    );
  });
  const svg = host.querySelector("svg");
  if (!svg) {
    root.unmount();
    throw new Error("qr_render_failed");
  }
  const { w, h } = QR_FORMAT_SIZE_MM[style.format];
  const pxPerMm = 300 / 25.4;
  const width = Math.round(w * pxPerMm);
  const height = Math.round(h * pxPerMm);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  if (fontCss) {
    const styleEl = document.createElementNS("http://www.w3.org/2000/svg", "style");
    styleEl.textContent = fontCss;
    svg.insertBefore(styleEl, svg.firstChild);
  }
  const markup = new XMLSerializer().serializeToString(svg);
  root.unmount();

  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("png_failed");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return missingLogo ? "no-logo" : "ok";
}

/** "luku-qr-tasca-do-rui-mesa-12.png" */
export function qrFileName(restaurantName: string, tableName?: string): string {
  const slug = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  return `luku-qr-${[slug(restaurantName) || "restaurante", tableName ? slug(tableName) : "geral"].join("-")}.png`;
}
