import { QRCodeSVG } from "qrcode.react";
import type { ReactNode } from "react";
import {
  QR_FORMAT_SIZE_MM,
  contrastRatio,
  onColor,
  qrModuleColor,
  type QrStyle,
} from "@/lib/qr-style";

/**
 * Cartão QR impresso, em SVG com unidades em milímetros — o MESMO desenho
 * serve a pré-visualização do estúdio, a folha A4 a imprimir (vetorial,
 * nítido em qualquer impressora) e o PNG para partilhar. 4 modelos
 * (`classic`, `bold`, `minimal`, `dark`) × 4 formatos (`card` A6, `tent`
 * display dobrável, `sticker` redondo, `mini` 85×55).
 */

export type QrCardData = {
  /** URL completo que o QR abre (`https://luku.ao/q/ABC2345`). */
  url: string;
  restaurantName: string;
  /** Logótipo do restaurante (URL ou data URL). */
  logo?: string | undefined;
  /** Nome da mesa ("Mesa 12", "Varanda"); ausente = QR geral. */
  tableName?: string | undefined;
};

export type QrCardLabels = {
  /** "MESA" */
  table: string;
  /** Frase por omissão quando `style.headline` está vazio. */
  headline: string;
  /** Rótulo do QR geral (sem mesa) — "Cardápio digital". */
  general: string;
  steps: [string, string, string];
  wifi: string;
  password: string;
  /** "Peça com a" (antes do logótipo Luku). */
  orderWith: string;
};

const FONT_DISPLAY = "Outfit, 'DM Sans', system-ui, sans-serif";
const FONT_BODY = "'DM Sans', Outfit, system-ui, sans-serif";
/** Proporção do logótipo Luku (`src/assets/logo.png`, 1618 × 972). */
const LUKU_RATIO = 1618 / 972;

// ── Medir texto (mm) ─────────────────────────────────────────────────────

let measureCtx: CanvasRenderingContext2D | null | undefined;

function measure(text: string, size: number, weight: number, family: string): number {
  if (measureCtx === undefined) {
    measureCtx =
      typeof document !== "undefined" ? document.createElement("canvas").getContext("2d") : null;
  }
  if (!measureCtx) return text.length * size * 0.56;
  measureCtx.font = `${weight} 100px ${family}`;
  return (measureCtx.measureText(text).width / 100) * size;
}

/** Maior tamanho (entre `min` e `max`) com que `text` cabe em `maxW`. */
function fitSize(
  text: string,
  maxW: number,
  max: number,
  min: number,
  weight: number,
  family = FONT_DISPLAY,
): number {
  const w = measure(text, max, weight, family);
  return w <= maxW ? max : Math.max(min, (max * maxW) / w);
}

/** Quebra em linhas que cabem em `maxW`; corta com "…" além de `maxLines`. */
function wrap(
  text: string,
  size: number,
  maxW: number,
  maxLines: number,
  weight: number,
  family = FONT_BODY,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (!current || measure(next, size, weight, family) <= maxW) {
      current = next;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = `${lines[maxLines - 1]!.replace(/\s+\S*$/, "")}…`;
  }
  return lines;
}

/** "Mesa 12" → { word: "Mesa", number: "12" }; "Varanda" → { number: "Varanda" }. */
function splitTable(name: string): { word?: string; number: string } {
  const m = name.trim().match(/^(.*?)[\s#nº.]*(\d+[A-Za-z]?)$/);
  if (m && m[2]) return { ...(m[1]?.trim() ? { word: m[1].trim() } : {}), number: m[2] };
  return { number: name.trim() };
}

// ── Paleta por modelo ────────────────────────────────────────────────────

type Palette = {
  bg: string;
  fg: string;
  muted: string;
  accent: string;
  onAccent: string;
  qrFg: string;
  frame: string;
  border: string;
  /** Selo Luku numa pílula branca (fundos escuros/coloridos). */
  lukuPill: boolean;
};

function palette(style: QrStyle): Palette {
  const c = style.color;
  switch (style.template) {
    case "bold":
      return {
        bg: "#ffffff",
        fg: "#1c1a19",
        muted: "#6b6560",
        accent: c,
        onAccent: onColor(c),
        qrFg: "#111111",
        frame: c,
        border: "#e7e2da",
        lukuPill: false,
      };
    case "minimal":
      return {
        bg: "#ffffff",
        fg: "#111111",
        muted: "#6b6b6b",
        accent: c,
        onAccent: onColor(c),
        qrFg: "#111111",
        frame: "#111111",
        border: "#e5e5e5",
        lukuPill: false,
      };
    case "dark": {
      const bg = "#161514";
      const accent = contrastRatio(c, bg) >= 3 ? c : "#ffffff";
      return {
        bg,
        fg: "#ffffff",
        muted: "#b8b2ab",
        accent,
        onAccent: onColor(accent),
        qrFg: "#111111",
        frame: accent,
        border: bg,
        lukuPill: true,
      };
    }
    default:
      return {
        bg: "#ffffff",
        fg: "#1c1a19",
        muted: "#6b6560",
        accent: c,
        onAccent: onColor(c),
        qrFg: qrModuleColor(c),
        frame: c,
        border: "#e7e2da",
        lukuPill: false,
      };
  }
}

// ── Peças ────────────────────────────────────────────────────────────────

function Txt({
  x,
  y,
  size,
  weight = 400,
  fill,
  family = FONT_BODY,
  anchor = "middle",
  spacing,
  maxWidth,
  children,
}: {
  x: number;
  y: number;
  size: number;
  weight?: number;
  fill: string;
  family?: string;
  anchor?: "start" | "middle" | "end";
  spacing?: number;
  maxWidth?: number;
  children: string;
}) {
  const squeeze = maxWidth !== undefined && measure(children, size, weight, family) > maxWidth;
  return (
    <text
      x={x}
      y={y}
      fontSize={size}
      fontWeight={weight}
      fill={fill}
      fontFamily={family}
      textAnchor={anchor}
      {...(spacing ? { letterSpacing: spacing } : {})}
      {...(squeeze ? { textLength: maxWidth, lengthAdjust: "spacingAndGlyphs" } : {})}
    >
      {children}
    </text>
  );
}

function Qr({
  x,
  y,
  size,
  url,
  fg,
  logo,
}: {
  x: number;
  y: number;
  size: number;
  url: string;
  fg: string;
  /** Logótipo ao centro (só com correção de erros alta). */
  logo?: string | undefined;
}) {
  const s = size * 0.24;
  return (
    <QRCodeSVG
      value={url}
      x={x}
      y={y}
      size={size}
      level={logo ? "H" : "M"}
      marginSize={0}
      fgColor={fg}
      bgColor="#ffffff"
      {...(logo ? { imageSettings: { src: logo, width: s, height: s, excavate: true } } : {})}
    />
  );
}

/** Painel branco à volta do QR (zona de silêncio) com moldura opcional. */
function QrPanel({
  x,
  y,
  size,
  url,
  p,
  frame,
  logo,
  radius = 4,
}: {
  x: number;
  y: number;
  size: number;
  url: string;
  p: Palette;
  frame: boolean;
  logo?: string | undefined;
  radius?: number;
}) {
  const pad = size * 0.09;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={size}
        height={size}
        rx={radius}
        fill="#ffffff"
        {...(frame ? { stroke: p.frame, strokeWidth: Math.max(0.8, size * 0.018) } : {})}
      />
      <Qr x={x + pad} y={y + pad} size={size - pad * 2} url={url} fg={p.qrFg} logo={logo} />
    </g>
  );
}

function LogoImage({
  href,
  x,
  y,
  w,
  h,
  align = "xMidYMid",
}: {
  href: string;
  x: number;
  y: number;
  w: number;
  h: number;
  align?: string;
}) {
  return (
    <image href={href} x={x} y={y} width={w} height={h} preserveAspectRatio={`${align} meet`} />
  );
}

/** "Peça com a [Luku]" — é por aqui que quem lê o QR conhece a Luku. */
function LukuBadge({
  cx,
  y,
  h,
  p,
  lukuLogo,
  label,
  anchor = "middle",
}: {
  cx: number;
  y: number;
  h: number;
  p: Palette;
  lukuLogo: string;
  label: string;
  anchor?: "middle" | "start" | "end";
}) {
  const logoH = h;
  const logoW = logoH * LUKU_RATIO;
  const size = h * 0.42;
  const textW = measure(label, size, 500, FONT_BODY);
  const gap = h * 0.25;
  const total = textW + gap + logoW;
  const left = anchor === "middle" ? cx - total / 2 : anchor === "start" ? cx : cx - total;
  const textColor = p.lukuPill ? "#3d3935" : p.muted;
  return (
    <g>
      {p.lukuPill && (
        <rect
          x={left - h * 0.45}
          y={y - h * 0.12}
          width={total + h * 0.9}
          height={h * 1.24}
          rx={h * 0.62}
          fill="#ffffff"
        />
      )}
      <Txt x={left} y={y + h * 0.66} size={size} weight={500} fill={textColor} anchor="start">
        {label}
      </Txt>
      <image href={lukuLogo} x={left + textW + gap} y={y} width={logoW} height={logoH} />
    </g>
  );
}

type LayoutProps = {
  d: QrCardData;
  s: QrStyle;
  p: Palette;
  l: QrCardLabels;
  lukuLogo: string;
};

function headlineOf(s: QrStyle, l: QrCardLabels): string {
  return s.headline.trim() || l.headline;
}

function wifiLine(s: QrStyle, l: QrCardLabels): string | null {
  if (!s.wifiName.trim()) return null;
  return s.wifiPassword.trim()
    ? `${l.wifi}: ${s.wifiName.trim()} · ${l.password}: ${s.wifiPassword.trim()}`
    : `${l.wifi}: ${s.wifiName.trim()}`;
}

// ── Cartão A6 (em pé) ────────────────────────────────────────────────────

function PortraitCard({ d, s, p, l, lukuLogo }: LayoutProps) {
  const W = 105;
  const H = 148;
  const pad = 9;
  const inner = W - pad * 2;
  const isBold = s.template === "bold";
  const isMinimal = s.template === "minimal";
  const hasLogo = s.showLogo && !!d.logo;
  const table = s.showTable && d.tableName ? splitTable(d.tableName) : null;
  const headerFg = isBold ? p.onAccent : p.fg;
  const els: ReactNode[] = [];
  let y = 10;

  // Cabeçalho: logótipo / nome / (minimal: mesa à esquerda)
  if (isMinimal) {
    if (table) {
      els.push(
        <Txt
          key="tw"
          x={pad}
          y={y + 3}
          size={3.2}
          weight={700}
          fill={p.muted}
          anchor="start"
          spacing={0.9}
        >
          {(table.word ?? l.table).toUpperCase()}
        </Txt>,
        <Txt
          key="tn"
          x={pad}
          y={y + 19}
          size={fitSize(table.number, 40, 18, 9, 800)}
          weight={800}
          fill={p.fg}
          family={FONT_DISPLAY}
          anchor="start"
        >
          {table.number}
        </Txt>,
      );
    } else if (!d.tableName) {
      els.push(
        <Txt
          key="gen"
          x={pad}
          y={y + 8}
          size={3.6}
          weight={800}
          fill={p.accent}
          family={FONT_DISPLAY}
          anchor="start"
          maxWidth={40}
        >
          {l.general.toUpperCase()}
        </Txt>,
      );
    }
    if (hasLogo) {
      els.push(
        <LogoImage key="lg" href={d.logo!} x={W - pad - 38} y={y} w={38} h={14} align="xMaxYMid" />,
      );
    } else if (s.showName) {
      els.push(
        <Txt
          key="nm"
          x={W - pad}
          y={y + 8}
          size={fitSize(d.restaurantName, 44, 5.2, 3, 700)}
          weight={700}
          fill={p.fg}
          family={FONT_DISPLAY}
          anchor="end"
        >
          {d.restaurantName}
        </Txt>,
      );
    }
    if (hasLogo && s.showName) {
      els.push(
        <Txt
          key="nm2"
          x={W - pad}
          y={y + 19}
          size={3.1}
          weight={500}
          fill={p.muted}
          anchor="end"
          maxWidth={44}
        >
          {d.restaurantName}
        </Txt>,
      );
    }
    y += 26;
  } else {
    if (hasLogo) {
      if (isBold) {
        els.push(
          <rect
            key="lgbg"
            x={W / 2 - 26}
            y={y - 2}
            width={52}
            height={20}
            rx={10}
            fill="#ffffff"
          />,
        );
      }
      els.push(<LogoImage key="lg" href={d.logo!} x={W / 2 - 23} y={y} w={46} h={16} />);
      y += 20;
    }
    if (s.showName) {
      const size = fitSize(d.restaurantName, inner, hasLogo ? 4.6 : 7, 3.4, 800);
      els.push(
        <Txt
          key="nm"
          x={W / 2}
          y={y + size * 0.9}
          size={size}
          weight={800}
          fill={headerFg}
          family={FONT_DISPLAY}
        >
          {d.restaurantName}
        </Txt>,
      );
      y += size + 3;
    }
  }

  // Frase
  const head = wrap(headlineOf(s, l), 4, inner, 2, 600);
  head.forEach((line, i) => {
    els.push(
      <Txt key={`h${i}`} x={W / 2} y={y + 4 + i * 5} size={4} weight={600} fill={headerFg}>
        {line}
      </Txt>,
    );
  });
  y += head.length * 5 + 3;

  // Rodapé, de baixo para cima
  let yb = H - 7;
  const footer: ReactNode[] = [];
  if (s.showLuku) {
    footer.push(
      <LukuBadge
        key="luku"
        cx={W / 2}
        y={yb - 7}
        h={7}
        p={p}
        lukuLogo={lukuLogo}
        label={l.orderWith}
      />,
    );
    yb -= 11;
  }
  const wifi = wifiLine(s, l);
  if (wifi) {
    footer.push(
      <Txt key="wifi" x={W / 2} y={yb} size={3} weight={600} fill={p.muted} maxWidth={inner}>
        {wifi}
      </Txt>,
    );
    yb -= 5.5;
  }
  if (s.footnote.trim()) {
    footer.push(
      <Txt key="fn" x={W / 2} y={yb} size={2.9} fill={p.muted} maxWidth={inner}>
        {s.footnote.trim()}
      </Txt>,
    );
    yb -= 5.5;
  }
  if (!isMinimal) {
    if (table) {
      if (isBold) {
        const label = `${(table.word ?? l.table).toUpperCase()} ${table.number}`;
        const size = fitSize(label, inner - 12, 8, 4.5, 800);
        const w = Math.min(inner, measure(label, size, 800, FONT_DISPLAY) + 14);
        footer.push(
          <g key="tbl">
            <rect x={W / 2 - w / 2} y={yb - 13} width={w} height={13} rx={6.5} fill={p.accent} />
            <Txt
              x={W / 2}
              y={yb - 6.5 + size * 0.36}
              size={size}
              weight={800}
              fill={p.onAccent}
              family={FONT_DISPLAY}
            >
              {label}
            </Txt>
          </g>,
        );
        yb -= 17;
      } else {
        footer.push(
          <Txt
            key="tw"
            x={W / 2}
            y={yb - 18.5}
            size={3.2}
            weight={700}
            fill={p.muted}
            spacing={1.2}
          >
            {(table.word ?? l.table).toUpperCase()}
          </Txt>,
          <Txt
            key="tn"
            x={W / 2}
            y={yb - 1}
            size={fitSize(table.number, inner, 17, 8, 800)}
            weight={800}
            fill={p.accent}
            family={FONT_DISPLAY}
          >
            {table.number}
          </Txt>,
        );
        yb -= 24;
      }
    } else if (!d.tableName) {
      footer.push(
        <Txt
          key="gen"
          x={W / 2}
          y={yb - 1}
          size={4.4}
          weight={800}
          fill={p.accent}
          family={FONT_DISPLAY}
          spacing={0.6}
        >
          {l.general.toUpperCase()}
        </Txt>,
      );
      yb -= 9;
    }
  }

  // QR no espaço que sobra
  const avail = yb - y - 2;
  const qrSize = Math.max(34, Math.min(isMinimal ? 72 : 64, avail, inner + 4));
  const qrX = (W - qrSize) / 2;
  const qrY = y + Math.max(0, (avail - qrSize) / 2);

  // Faixa do modelo "bold": vai até meio do QR.
  const band = isBold ? (
    <path
      key="band"
      d={`M0 5 Q0 0 5 0 H${W - 5} Q${W} 0 ${W} 5 V${qrY + qrSize * 0.45} H0 Z`}
      fill={p.accent}
    />
  ) : null;

  return (
    <>
      <rect width={W} height={H} rx={5} fill={p.bg} stroke={p.border} strokeWidth={0.3} />
      {band}
      {els}
      <QrPanel
        x={qrX}
        y={qrY}
        size={qrSize}
        url={d.url}
        p={p}
        frame={!isMinimal && !isBold}
        logo={s.logoInQr ? d.logo : undefined}
        radius={isMinimal ? 1 : 5}
      />
      {isBold && (
        <rect
          x={qrX}
          y={qrY}
          width={qrSize}
          height={qrSize}
          rx={5}
          fill="none"
          stroke="#000000"
          strokeOpacity={0.08}
          strokeWidth={0.6}
        />
      )}
      {isMinimal && (
        <line
          x1={pad}
          x2={W - pad}
          y1={qrY + qrSize + 3}
          y2={qrY + qrSize + 3}
          stroke={p.accent}
          strokeWidth={0.8}
        />
      )}
      {footer}
    </>
  );
}

// ── Display dobrável (face 210 × 148,5) e mini (85 × 55) ─────────────────

function LandscapeCard({
  d,
  s,
  p,
  l,
  lukuLogo,
  W,
  H,
  compact,
}: LayoutProps & { W: number; H: number; compact: boolean }) {
  const isBold = s.template === "bold";
  const isMinimal = s.template === "minimal";
  const bg = isBold ? p.accent : p.bg;
  const fg = isBold ? p.onAccent : p.fg;
  const muted = isBold ? p.onAccent : p.muted;
  const accent = isBold ? p.onAccent : p.accent;
  const hasLogo = s.showLogo && !!d.logo;
  const table = s.showTable && d.tableName ? splitTable(d.tableName) : null;
  const k = H / 148.5; // escala relativa ao display grande
  const pad = compact ? 4.5 : 13;
  // No display grande o QR fica com ~96 mm (lê-se do outro lado da mesa) e
  // sobra uma coluna larga para o texto; no mini ocupa a altura toda.
  const qrSize = compact ? H - pad * 2 : Math.min(H - pad * 2, 96);
  const qrY = (H - qrSize) / 2;
  const colX = pad + qrSize + (compact ? 4 : 14);
  const colW = W - colX - pad;
  const els: ReactNode[] = [];
  let y = pad;

  // Rodapé primeiro (de baixo para cima) — o que sobra no meio decide se
  // os 3 passos cabem.
  const wifi = wifiLine(s, l);
  const bottom: ReactNode[] = [];
  let yb = H - pad;
  if (s.showLuku) {
    const h = compact ? 4.2 : 9;
    bottom.push(
      <LukuBadge
        key="luku"
        cx={colX}
        y={yb - h}
        h={h}
        p={isBold ? { ...p, lukuPill: true } : p}
        lukuLogo={lukuLogo}
        label={l.orderWith}
        anchor="start"
      />,
    );
    yb -= h + (compact ? 2 : 5);
  }
  if (wifi && !compact) {
    bottom.push(
      <Txt
        key="wifi"
        x={colX}
        y={yb}
        size={3.6}
        weight={600}
        fill={muted}
        anchor="start"
        maxWidth={colW}
      >
        {wifi}
      </Txt>,
    );
    yb -= 6;
  }
  if (s.footnote.trim() && !compact) {
    bottom.push(
      <Txt key="fn" x={colX} y={yb} size={3.4} fill={muted} anchor="start" maxWidth={colW}>
        {s.footnote.trim()}
      </Txt>,
    );
    yb -= 6;
  }

  if (hasLogo && !compact) {
    if (isBold) {
      els.push(
        <rect
          key="lgbg"
          x={colX - 2}
          y={y - 2}
          width={Math.min(colW, 56) + 4}
          height={19}
          rx={9.5}
          fill="#ffffff"
        />,
      );
    }
    els.push(
      <LogoImage
        key="lg"
        href={d.logo!}
        x={colX}
        y={y}
        w={Math.min(colW, 56)}
        h={15}
        align="xMinYMid"
      />,
    );
    y += 20;
  }
  if (s.showName) {
    const size = fitSize(
      d.restaurantName,
      colW,
      compact ? 3.4 : hasLogo ? 6 : 8,
      compact ? 2.4 : 4,
      800,
    );
    els.push(
      <Txt
        key="nm"
        x={colX}
        y={y + size * 0.9}
        size={size}
        weight={800}
        fill={fg}
        family={FONT_DISPLAY}
        anchor="start"
        maxWidth={colW}
      >
        {d.restaurantName}
      </Txt>,
    );
    y += size + (compact ? 1.5 : 3);
  }

  if (table) {
    const wordSize = compact ? 2.4 : 5;
    els.push(
      <Txt
        key="tw"
        x={colX}
        y={y + wordSize}
        size={wordSize}
        weight={700}
        fill={muted}
        anchor="start"
        spacing={compact ? 0.5 : 1.5}
      >
        {(table.word ?? l.table).toUpperCase()}
      </Txt>,
    );
    y += wordSize + 1;
    const numSize = fitSize(table.number, colW, compact ? 14 : 30, compact ? 6 : 12, 800);
    els.push(
      <Txt
        key="tn"
        x={colX - numSize * 0.04}
        y={y + numSize * 0.78}
        size={numSize}
        weight={800}
        fill={accent}
        family={FONT_DISPLAY}
        anchor="start"
      >
        {table.number}
      </Txt>,
    );
    y += numSize * 0.85 + (compact ? 1.5 : 4);
  } else if (!d.tableName) {
    const size = compact ? 3 : 6;
    els.push(
      <Txt
        key="gen"
        x={colX}
        y={y + size}
        size={size}
        weight={800}
        fill={accent}
        family={FONT_DISPLAY}
        anchor="start"
        maxWidth={colW}
      >
        {l.general.toUpperCase()}
      </Txt>,
    );
    y += size + (compact ? 2 : 5);
  }

  const headSize = compact ? 2.5 : 5;
  const head = wrap(headlineOf(s, l), headSize, colW, compact ? 3 : 2, 600);
  head.forEach((line, i) => {
    els.push(
      <Txt
        key={`h${i}`}
        x={colX}
        y={y + headSize + i * headSize * 1.25}
        size={headSize}
        weight={600}
        fill={fg}
        anchor="start"
      >
        {line}
      </Txt>,
    );
  });
  y += head.length * headSize * 1.25 + (compact ? 1 : 4);

  if (!compact && y + 24 <= yb - 2) {
    l.steps.forEach((step, i) => {
      const cy = y + 4 + i * 7.5;
      els.push(
        <g key={`st${i}`}>
          <circle cx={colX + 3.4} cy={cy} r={3.4} fill={isBold ? p.onAccent : p.accent} />
          <Txt
            x={colX + 3.4}
            y={cy + 1.3}
            size={3.6}
            weight={800}
            fill={isBold ? p.accent : p.onAccent}
            family={FONT_DISPLAY}
          >
            {String(i + 1)}
          </Txt>
          <Txt
            x={colX + 9.5}
            y={cy + 1.4}
            size={3.8}
            weight={500}
            fill={fg}
            anchor="start"
            maxWidth={colW - 10}
          >
            {step}
          </Txt>
        </g>,
      );
    });
    y += 24;
  }

  return (
    <>
      <rect
        width={W}
        height={H}
        rx={compact ? 3 : 4 * k}
        fill={bg}
        stroke={isBold ? bg : p.border}
        strokeWidth={0.3}
      />
      <QrPanel
        x={pad}
        y={qrY}
        size={qrSize}
        url={d.url}
        p={p}
        frame={!isMinimal && !isBold}
        logo={s.logoInQr ? d.logo : undefined}
        radius={compact ? 2.5 : 6}
      />
      {els}
      {bottom}
    </>
  );
}

// ── Autocolante redondo (80 mm) ──────────────────────────────────────────

function RoundSticker({ d, s, p, l, lukuLogo }: LayoutProps) {
  const R = 40;
  const isBold = s.template === "bold";
  const isMinimal = s.template === "minimal";
  const bg = isBold ? p.accent : p.bg;
  const fg = isBold ? p.onAccent : p.fg;
  const table = s.showTable && d.tableName ? splitTable(d.tableName) : null;
  const qrSize = 40;
  const topLabel = table
    ? `${(table.word ?? l.table).toUpperCase()} ${table.number}`
    : s.showName
      ? d.restaurantName
      : l.general.toUpperCase();
  const topSize = fitSize(topLabel, 44, 6.2, 3, 800);

  return (
    <>
      <circle
        cx={R}
        cy={R}
        r={R - 0.2}
        fill={bg}
        stroke={isMinimal ? "#111111" : p.border}
        strokeWidth={isMinimal ? 0.6 : 0.3}
      />
      {!isBold && !isMinimal && (
        <circle cx={R} cy={R} r={R - 2.2} fill="none" stroke={p.accent} strokeWidth={1.6} />
      )}
      <Txt
        x={R}
        y={15.5}
        size={topSize}
        weight={800}
        fill={table ? (isBold ? fg : p.accent) : fg}
        family={FONT_DISPLAY}
      >
        {topLabel}
      </Txt>
      <QrPanel
        x={R - qrSize / 2}
        y={19.5}
        size={qrSize}
        url={d.url}
        p={p}
        frame={false}
        logo={s.logoInQr ? d.logo : undefined}
        radius={3}
      />
      <Txt x={R} y={65} size={2.8} weight={600} fill={fg} maxWidth={46}>
        {wrap(headlineOf(s, l), 2.8, 46, 1, 600)[0] ?? ""}
      </Txt>
      {s.showLuku && (
        <LukuBadge
          cx={R}
          y={67.8}
          h={4.6}
          p={isBold ? { ...p, lukuPill: true } : p}
          lukuLogo={lukuLogo}
          label={l.orderWith}
        />
      )}
    </>
  );
}

// ── Cartão ───────────────────────────────────────────────────────────────

export function QrCard({
  data,
  style,
  labels,
  lukuLogo,
  className,
  widthMm,
  id,
}: {
  data: QrCardData;
  style: QrStyle;
  labels: QrCardLabels;
  /** URL do logótipo Luku (asset ou data URL para exportar PNG). */
  lukuLogo: string;
  className?: string;
  /** Largura física (impressão). Sem isto, ocupa 100% do contentor. */
  widthMm?: number;
  id?: string;
}) {
  const { w, h } = QR_FORMAT_SIZE_MM[style.format];
  const p = palette(style);
  const props: LayoutProps = { d: data, s: style, p, l: labels, lukuLogo };
  const scale = widthMm ? widthMm / w : 1;
  return (
    <svg
      id={id}
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      viewBox={`0 0 ${w} ${h}`}
      {...(widthMm
        ? { width: `${widthMm}mm`, height: `${h * scale}mm` }
        : { width: "100%", height: "auto" })}
      className={className}
      role="img"
      aria-label={
        data.tableName ? `${data.restaurantName} — ${data.tableName}` : data.restaurantName
      }
    >
      {style.format === "card" && <PortraitCard {...props} />}
      {style.format === "tent" && <LandscapeCard {...props} W={w} H={h} compact={false} />}
      {style.format === "mini" && <LandscapeCard {...props} W={w} H={h} compact />}
      {style.format === "sticker" && <RoundSticker {...props} />}
    </svg>
  );
}
