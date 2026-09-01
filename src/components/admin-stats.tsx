import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

/**
 * Blocos de estatísticas partilhados pelas páginas do painel do restaurante
 * (Reservas, Pedidos, Clientes, …) — mesma linguagem visual: `card-soft`,
 * barras para comparação, gráfico de linha para tendência, KPIs em formatos
 * distintos, cores só com significado semântico.
 */

/** Classe única dos selects/campos de filtro (cinza, destaque laranja no foco). */
export const ADMIN_FILTER_SELECT =
  "rounded-lg border border-border bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground accent-brand outline-none transition-colors focus:border-brand focus:text-brand";

export function StatSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export function StatCard({
  title,
  subtitle,
  right,
  wide,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`card-soft p-5 sm:p-6 ${wide ? "lg:col-span-2" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {right}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

/** Selo de variação (▲/▼ N%) com cor semântica. */
export function TrendBadge({ delta, label }: { delta: number | null; label: string }) {
  if (delta === null) return null;
  const up = delta >= 0;
  return (
    <span
      className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${
        up ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
      }`}
    >
      {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
      {Math.abs(delta)}%<span className="font-medium text-muted-foreground">{label}</span>
    </span>
  );
}

export type StatBarRow = {
  key: string;
  label: string;
  count: number;
  pct: number;
  /** classe de fundo, ex: "bg-success" */
  tone: string;
};

export function StatBars({ rows }: { rows: StatBarRow[] }) {
  return (
    <div className="space-y-4">
      {rows.map((r) => (
        <div key={r.key}>
          <div className="flex items-baseline justify-between text-sm">
            <span className="flex items-center gap-2 font-medium text-foreground">
              <span className={`h-2 w-2 rounded-full ${r.tone}`} />
              {r.label}
            </span>
            <span className="tabular-nums text-muted-foreground">
              <span className="font-bold text-foreground">{r.count}</span> · {r.pct}%
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface">
            <div
              className={`h-full rounded-full ${r.tone}`}
              style={{ width: `${Math.max(r.pct, 2)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MiniBars({
  bars,
  unit,
  tone = "bg-primary/80",
}: {
  bars: { label: string; value: number }[];
  unit?: string;
  tone?: string;
}) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <div>
      <div className="flex h-16 items-end gap-1.5">
        {bars.map((b, i) => (
          <div
            key={i}
            title={unit ? `${b.value} ${unit}` : String(b.value)}
            className={`flex-1 rounded-md ${b.value > 0 ? tone : "bg-surface"}`}
            style={{ height: `${b.value > 0 ? Math.max((b.value / max) * 100, 12) : 8}%` }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5 text-center text-[10px] font-semibold uppercase text-muted-foreground">
        {bars.map((b, i) => (
          <span key={i} className="flex-1">
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Gráfico de tendência: área+linha para a série `a`, linha tracejada para `b`. */
export function TrendArea({
  points,
  legendA,
  legendB,
}: {
  points: { label: string; a: number; b?: number }[];
  legendA: string;
  legendB?: string;
}) {
  const W = 320;
  const H = 120;
  const pad = 12;
  const n = points.length;
  const maxY = Math.max(1, ...points.flatMap((p) => [p.a, p.b ?? 0]));
  const x = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * W);
  const y = (v: number) => H - pad - (v / maxY) * (H - pad * 2);
  const line = (sel: (p: (typeof points)[number]) => number) =>
    points
      .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(sel(p)).toFixed(1)}`)
      .join(" ");
  const aLine = line((p) => p.a);
  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-40 w-full"
        role="img"
        aria-label={legendA}
      >
        {[0, 0.5, 1].map((f) => (
          <line
            key={f}
            x1="0"
            x2={W}
            y1={pad + f * (H - pad * 2)}
            y2={pad + f * (H - pad * 2)}
            className="stroke-border"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <path d={`${aLine} L${W},${H} L0,${H} Z`} className="fill-primary/10" />
        <path
          d={aLine}
          className="stroke-primary"
          strokeWidth="2"
          fill="none"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {legendB && (
          <path
            d={line((p) => p.b ?? 0)}
            className="stroke-success"
            strokeWidth="1.5"
            fill="none"
            strokeDasharray="4 3"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      <div className="mt-2 flex justify-between text-[10px] font-medium text-muted-foreground">
        {points.map((p, i) => (
          <span key={i} className={i % 2 === 0 ? "opacity-0 sm:opacity-100" : ""}>
            {p.label}
          </span>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-primary" /> {legendA}
        </span>
        {legendB && (
          <span className="flex items-center gap-1.5">
            <span className="h-0 w-3 border-t-2 border-dashed border-success" /> {legendB}
          </span>
        )}
      </div>
    </div>
  );
}

const KPI_ICON_TONE: Record<string, string> = {
  primary: "text-primary",
  success: "text-success",
  brand: "text-brand",
  muted: "text-muted-foreground",
};
const KPI_VALUE_TONE: Record<string, string> = {
  primary: "text-foreground",
  success: "text-success",
  brand: "text-brand",
  muted: "text-foreground",
};

export function KpiTile({
  icon: Icon,
  label,
  value,
  hint,
  tone = "primary",
  big = true,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  tone?: "primary" | "success" | "brand" | "muted";
  /** `false` = número mais discreto (`text-2xl`), para KPIs informativos. */
  big?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="card-soft flex flex-col p-5 sm:p-6">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className={`h-4 w-4 ${KPI_ICON_TONE[tone]}`} />
        {label}
      </div>
      <p
        className={`mt-3 font-display font-extrabold ${
          big ? "text-4xl" : "text-2xl"
        } ${KPI_VALUE_TONE[tone]}`}
      >
        {value}
      </p>
      {children && <div className="mt-3">{children}</div>}
      {hint && <p className="mt-auto pt-2 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Barra de progresso fina (ex: taxa de aceitação). */
export function MiniProgress({ pct, tone = "bg-success" }: { pct: number; tone?: string }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-surface">
      <div
        className={`h-full rounded-full ${tone}`}
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  );
}

export function AdminField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium text-foreground">{children}</dd>
    </div>
  );
}
