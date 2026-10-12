import type { TableShape } from "@/data/tables-store";
import { cn } from "@/lib/utils";

/**
 * Desenho de uma mesa vista de cima — tampo na forma certa e uma cadeira
 * por lugar à volta (sofá em "U" para `booth`, bancos altos para `high`).
 * Serve de ícone na lista, no seletor de forma e na planta da sala do dia;
 * `tone` pinta o tampo (livre / ocupada / selecionada / fora de serviço).
 */
export type GlyphTone = "idle" | "busy" | "selected" | "off" | "combo";

const TOP: Record<GlyphTone, string> = {
  idle: "fill-card stroke-border",
  busy: "fill-brand/15 stroke-brand",
  selected: "fill-primary/15 stroke-primary",
  off: "fill-muted stroke-border",
  combo: "fill-primary/10 stroke-primary/60",
};
const CHAIR: Record<GlyphTone, string> = {
  idle: "fill-muted-foreground/35",
  busy: "fill-brand/70",
  selected: "fill-primary/70",
  off: "fill-muted-foreground/20",
  combo: "fill-primary/50",
};

type Pt = { x: number; y: number; r?: number };

/** Distribui `n` pontos ao longo do perímetro de um retângulo (cadeiras). */
function aroundRect(n: number, x: number, y: number, w: number, h: number, gap: number): Pt[] {
  if (n <= 0) return [];
  // Lados compridos primeiro — duas cadeiras nas pontas só a partir de 6.
  const ends = w > h ? (n >= 6 ? 2 : 0) : n >= 4 ? 2 : 0;
  const perSide = n - ends;
  const top = Math.ceil(perSide / 2);
  const bottom = perSide - top;
  const pts: Pt[] = [];
  const along = (count: number, yy: number) => {
    for (let i = 0; i < count; i += 1) pts.push({ x: x + (w * (i + 1)) / (count + 1), y: yy });
  };
  if (w >= h) {
    along(top, y - gap);
    along(bottom, y + h + gap);
    if (ends) pts.push({ x: x - gap, y: y + h / 2 }, { x: x + w + gap, y: y + h / 2 });
  } else {
    for (let i = 0; i < top; i += 1) pts.push({ x: x - gap, y: y + (h * (i + 1)) / (top + 1) });
    for (let i = 0; i < bottom; i += 1) {
      pts.push({ x: x + w + gap, y: y + (h * (i + 1)) / (bottom + 1) });
    }
    if (ends) pts.push({ x: x + w / 2, y: y - gap }, { x: x + w / 2, y: y + h + gap });
  }
  return pts;
}

function aroundCircle(n: number, cx: number, cy: number, radius: number): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return { x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius };
  });
}

export function TableGlyph({
  shape = "square",
  seats,
  size = 48,
  tone = "idle",
  className,
  label,
}: {
  shape?: TableShape | undefined;
  seats: number;
  size?: number;
  tone?: GlyphTone;
  className?: string;
  /** Texto dentro do tampo (ex.: número da mesa). */
  label?: string | undefined;
}) {
  // Acima de 12 cadeiras o desenho deixa de ser legível — o número diz o resto.
  const shown = Math.max(0, Math.min(seats, 12));
  const V = 100;
  let top: React.ReactNode;
  let chairs: Pt[] = [];
  let chairR = 6.5;

  switch (shape) {
    case "round": {
      const r = shown > 6 ? 30 : 26;
      top = <circle cx={50} cy={50} r={r} strokeWidth={2.5} className={TOP[tone]} />;
      chairs = aroundCircle(shown, 50, 50, r + 11);
      break;
    }
    case "high": {
      top = <circle cx={50} cy={50} r={20} strokeWidth={2.5} className={TOP[tone]} />;
      chairs = aroundCircle(shown, 50, 50, 33);
      chairR = 5.5;
      break;
    }
    case "rectangle": {
      const w = shown > 6 ? 70 : 62;
      const h = 34;
      top = (
        <rect
          x={50 - w / 2}
          y={50 - h / 2}
          width={w}
          height={h}
          rx={6}
          strokeWidth={2.5}
          className={TOP[tone]}
        />
      );
      chairs = aroundRect(shown, 50 - w / 2, 50 - h / 2, w, h, 11);
      break;
    }
    case "booth": {
      // Tampo + sofá em "U" — sem cadeiras soltas (lugares fixos).
      top = (
        <>
          <path
            d="M14 26 Q14 14 26 14 H74 Q86 14 86 26 V80 H74 V28 H26 V80 H14 Z"
            className={CHAIR[tone]}
          />
          <rect
            x={30}
            y={34}
            width={40}
            height={36}
            rx={5}
            strokeWidth={2.5}
            className={TOP[tone]}
          />
        </>
      );
      chairs = [];
      break;
    }
    default: {
      const s = shown > 4 ? 46 : 40;
      top = (
        <rect
          x={50 - s / 2}
          y={50 - s / 2}
          width={s}
          height={s}
          rx={6}
          strokeWidth={2.5}
          className={TOP[tone]}
        />
      );
      chairs = aroundRect(shown, 50 - s / 2, 50 - s / 2, s, s, 11);
    }
  }

  return (
    <svg
      viewBox={`0 0 ${V} ${V}`}
      width={size}
      height={size}
      aria-hidden
      className={cn("shrink-0 overflow-visible", className)}
    >
      {chairs.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={chairR} className={CHAIR[tone]} />
      ))}
      {top}
      {label && (
        <text
          x={50}
          y={shape === "booth" ? 52 : 50}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-foreground font-display"
          fontSize={label.length > 3 ? 13 : 18}
          fontWeight={800}
        >
          {label}
        </text>
      )}
    </svg>
  );
}

/** "Mesa 12" → "12"; "Esplanada 3" → "3"; "VIP" → "VIP". */
export function tableShortLabel(name: string): string {
  const num = name.match(/(\d+)\s*$/)?.[1];
  if (num) return num;
  const trimmed = name.trim();
  return trimmed.length <= 4 ? trimmed : trimmed.slice(0, 3);
}
