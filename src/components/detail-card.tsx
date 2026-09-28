import {
  BadgeCheck,
  Bike,
  Check,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  Clock,
  Package,
  Receipt,
  TriangleAlert,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { useId, type ReactNode } from "react";
import type { CartOrderStatus } from "@/lib/cart";

/**
 * Primitivos partilhados do card de detalhe de um registo (pedido/reserva,
 * lado do cliente E do restaurante).
 *
 * Princípios de design aplicados:
 *  1. Hierarquia por contraste — o valor é sempre mais forte que o rótulo.
 *  2. Cor com significado — o tom vem do estado (tinta + anel + ÍCONE).
 *  3. Agrupamento (Gestalt) — factos numa grelha, secções em subcards, e um
 *     único elemento "herói": o total.
 *  4. Robustez — textos longos quebram em vez de rebentar o layout.
 *  5. Acessibilidade — landmarks/headings, `aria-hidden` nos ícones
 *     decorativos, `role="status"` no estado, `motion-safe` nas animações.
 *
 * Só apresentação — nenhuma lógica de negócio. A API anterior mantém-se
 * 100% compatível: tudo o que foi acrescentado é opcional.
 */

/* ------------------------------------------------------------------ */
/* Barra superior (voltar + reclamações)                               */
/* ------------------------------------------------------------------ */

/** Linha do topo da página de detalhe: botão/link "Voltar" à esquerda e,
 * à direita, o contacto para reclamações — "Reclamações: <contacto>", sem
 * ícone. Em ecrãs muito estreitos o contacto reflui para a linha de baixo,
 * alinhado à direita, em vez de espremer o botão.
 *
 * Uso:
 *   <DetailTopBar
 *     back={<Link to="/pedidos">← Voltar</Link>}
 *     complaintContact={<a href="tel:+244900000000">+244 900 000 000</a>}
 *   />
 */
export function DetailTopBar({
  back,
  complaintContact,
  complaintLabel = "Reclamações",
}: {
  back: ReactNode;
  /** Telefone/e-mail para reclamações (pode ser um `<a href="tel:…">`). */
  complaintContact?: ReactNode;
  complaintLabel?: string | undefined;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <div className="shrink-0 text-sm font-medium">{back}</div>
      {complaintContact && (
        <p className="ml-auto min-w-0 max-w-full text-xs text-muted-foreground [overflow-wrap:anywhere]">
          {complaintLabel}:{" "}
          <span className="font-semibold tabular-nums text-foreground">{complaintContact}</span>
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Estado                                                              */
/* ------------------------------------------------------------------ */

export type StatusVisual = {
  /** Fundo tingido + cor do texto/ícone. */
  tone: string;
  Icon: LucideIcon;
  /** Anel fino que dá contorno ao badge sobre fundos claros e escuros. */
  ring?: string | undefined;
  /** Estado "em curso" — mostra um ponto pulsante (só com motion permitido). */
  live?: boolean | undefined;
};

/** Paleta única de tons — tinta 15% + anel 30%. Evita repetir strings. */
const TONES = {
  brand: { tone: "bg-brand/15 text-brand", ring: "ring-brand/30" },
  primary: { tone: "bg-primary/15 text-primary", ring: "ring-primary/30" },
  success: { tone: "bg-success/15 text-success", ring: "ring-success/30" },
  destructive: {
    tone: "bg-destructive/15 text-destructive",
    ring: "ring-destructive/30",
  },
  neutral: {
    tone: "bg-muted-foreground/15 text-muted-foreground",
    ring: "ring-muted-foreground/25",
  },
} as const;

/** Mesmas cores já usadas em `sistema.operacao.tsx` (`orderStatusTone`) —
 * consolidadas num sítio, com um ícone por estado. Estados "em curso"
 * (`live`) ganham um ponto pulsante para sinalizar que algo está a decorrer. */
const ORDER_STATUS_VISUAL: Record<CartOrderStatus, StatusVisual> = {
  pending: { ...TONES.brand, Icon: Clock, live: true },
  accepted: { ...TONES.primary, Icon: BadgeCheck, live: true },
  onTheWay: { ...TONES.primary, Icon: Bike, live: true },
  ready: { ...TONES.primary, Icon: Package, live: true },
  delivered: { ...TONES.success, Icon: CircleCheck },
  completed: { ...TONES.success, Icon: CircleCheck },
  rejected: { ...TONES.destructive, Icon: XCircle },
  canceled: { ...TONES.neutral, Icon: CircleDashed },
};

/** Mesmas cores já usadas em `admin.reservas.tsx` (`statusTone`) — estado
 * de reserva guarda-se como string em português (ver mock), não um union
 * fechado; estados desconhecidos caem no tom neutro. */
const RESERVATION_STATUS_VISUAL: Record<string, StatusVisual> = {
  Pendente: { ...TONES.brand, Icon: Clock, live: true },
  Confirmada: { ...TONES.success, Icon: CircleCheck },
  Recusada: { ...TONES.destructive, Icon: XCircle },
  Cancelada: { ...TONES.neutral, Icon: CircleDashed },
  Anulada: { ...TONES.neutral, Icon: CircleDashed },
  "Não compareceu": { ...TONES.destructive, Icon: XCircle },
};

export function orderStatusVisual(status: CartOrderStatus): StatusVisual {
  return ORDER_STATUS_VISUAL[status];
}

export function reservationStatusVisual(status: string): StatusVisual {
  return (
    RESERVATION_STATUS_VISUAL[status] ?? {
      tone: "bg-surface text-muted-foreground",
      ring: "ring-border",
      Icon: CircleDashed,
    }
  );
}

/** Badge de estado: ícone + texto + anel. `role="status"` para que leitores
 * de ecrã anunciem a mudança quando o estado é atualizado em tempo real. */
export function StatusBadge({ visual, children }: { visual: StatusVisual; children: ReactNode }) {
  return (
    <span
      role="status"
      className={`relative inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${visual.tone} ${visual.ring ?? "ring-border"}`}
    >
      <visual.Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {children}
      {visual.live && (
        <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-current opacity-50 motion-safe:animate-ping" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-current" />
        </span>
      )}
    </span>
  );
}

/** Pequena etiqueta neutra (ex.: nº do pedido) para o slot `meta`. */
export function DetailChip({
  icon: Icon,
  children,
}: {
  icon?: LucideIcon | undefined;
  children: ReactNode;
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground ring-1 ring-inset ring-border/60">
      {Icon && <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />}
      <span className="truncate">{children}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Cabeçalho                                                           */
/* ------------------------------------------------------------------ */

/** Cabeçalho do card — imagem (ou ícone) à esquerda; à direita da imagem:
 *
 *   Nome (restaurante ou cliente)                       [extra]
 *   28 set 2026
 *   [● Estado]  19:30 - 4 pessoas
 *   subtítulo
 *   chips
 *
 * O estado, a hora (prevista) e o nº de pessoas ficam na MESMA linha, logo
 * abaixo do nome/data e ao lado da imagem; se não couberem, refluem para a
 * linha seguinte em vez de espremer. A hora e as pessoas são texto simples,
 * sem rótulo nem ícone, separados por " - ". Cada parte é opcional. A ação
 * `extra` (ex.: popover de contacto) fica alinhada ao nome, à direita. */
export function DetailHeader({
  image,
  icon: FallbackIcon,
  title,
  date,
  time,
  people,
  subtitle,
  meta,
  status,
  extra,
}: {
  image?: string | undefined;
  /** Ícone mostrado num tile quando não há imagem. */
  icon?: LucideIcon | undefined;
  title: ReactNode;
  /** Data, já formatada (ex.: "28 set 2026"). */
  date?: ReactNode;
  /** Hora (prevista), já formatada (ex.: "19:30"). */
  time?: ReactNode;
  /** Nº de pessoas, já com a unidade traduzida (ex.: "4 pessoas"). */
  people?: ReactNode;
  subtitle?: ReactNode;
  /** Linha de chips/factos rápidos por baixo do subtítulo (ver `DetailChip`). */
  meta?: ReactNode;
  /** Badge de estado (ver `StatusBadge`). */
  status?: ReactNode;
  extra?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3.5">
      {image ? (
        <img
          src={image}
          alt=""
          loading="lazy"
          className="h-16 w-16 shrink-0 rounded-2xl object-cover shadow-sm ring-1 ring-border/60"
        />
      ) : FallbackIcon ? (
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/15">
          <FallbackIcon className="h-7 w-7" aria-hidden="true" />
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h2 className="line-clamp-2 min-w-0 break-words font-display text-lg font-bold leading-snug text-foreground">
            {title}
          </h2>
          {extra && <div className="flex shrink-0 items-center gap-2">{extra}</div>}
        </div>
        {(date || time || people) && (
          <p className="mt-0.5 truncate text-sm font-medium tabular-nums text-muted-foreground">
            {date}
            {date && time ? " · " : null}
            {time}
            {(date || time) && people ? " · " : null}
            {people}
          </p>
        )}
        {status && (
          <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            {status}
          </div>
        )}
        {subtitle && <p className="mt-1.5 truncate text-sm text-muted-foreground">{subtitle}</p>}
        {meta && <div className="mt-2 flex flex-wrap items-center gap-1.5">{meta}</div>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Factos                                                              */
/* ------------------------------------------------------------------ */

/** Grelha de factos com um separador no topo, que dá ritmo entre o
 * cabeçalho e o corpo. Opcional: um `<dl className="grid grid-cols-2 gap-x-4
 * gap-y-4">` escrito à mão continua a funcionar tal e qual. */
export function DetailFacts({ children }: { children: ReactNode }) {
  return (
    <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5 border-t border-border/60 pt-5">
      {children}
    </dl>
  );
}

const ROW_ICON_TONE = {
  default: "bg-primary/10 text-primary",
  brand: "bg-brand/15 text-brand",
  success: "bg-success/15 text-success",
  danger: "bg-destructive/15 text-destructive",
} as const;

/** Par rótulo/valor com ícone âncora. O valor tem sempre mais peso que o
 * rótulo (hierarquia), e quebra em qualquer ponto para nunca rebentar a
 * grelha com e-mails ou moradas longas. `tone` destaca um facto crítico
 * (ex.: pagamento em falta) sem mudar a estrutura. */
export function DetailRow({
  icon: Icon,
  label,
  span,
  tone = "default",
  children,
}: {
  icon: LucideIcon;
  label: string;
  span?: boolean | undefined;
  tone?: keyof typeof ROW_ICON_TONE | undefined;
  children: ReactNode;
}) {
  return (
    <div className={`flex min-w-0 items-start gap-3 ${span ? "col-span-full" : ""}`}>
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${ROW_ICON_TONE[tone]}`}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 text-sm font-semibold leading-snug text-foreground [overflow-wrap:anywhere]">
          {children}
        </dd>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Secções                                                             */
/* ------------------------------------------------------------------ */

type SectionTone = "default" | "warning" | "danger";

const SECTION_TONE: Record<SectionTone, { box: string; icon: string; fallback?: LucideIcon }> = {
  default: {
    box: "border-border/60 bg-surface/50",
    icon: "bg-primary/10 text-primary",
  },
  warning: {
    box: "border-brand/30 bg-brand/5",
    icon: "bg-brand/15 text-brand",
    fallback: TriangleAlert,
  },
  danger: {
    box: "border-destructive/30 bg-destructive/5",
    icon: "bg-destructive/15 text-destructive",
    fallback: CircleAlert,
  },
};

/** Subcard para os blocos secundários (comprovativo, fatura, mapa, estafeta,
 * pedidos especiais...). Cabeçalho próprio com ícone em tile, título legível
 * e slot de ação à direita. Os tons `warning` e `danger` trazem ícone por
 * omissão — o significado nunca depende só da cor. É uma `<section>`
 * etiquetada pelo seu título (`h3`, abaixo do `h2` do cabeçalho). */
export function DetailSection({
  icon,
  title,
  description,
  action,
  tone = "default",
  children,
}: {
  icon?: LucideIcon | undefined;
  title: ReactNode;
  /** Frase de apoio por baixo do título. */
  description?: ReactNode;
  /** Ação secundária alinhada à direita do cabeçalho (ex.: "Ver mapa"). */
  action?: ReactNode;
  tone?: SectionTone | undefined;
  children: ReactNode;
}) {
  const id = useId();
  const t = SECTION_TONE[tone];
  const Icon = icon ?? t.fallback;
  return (
    <section aria-labelledby={id} className={`mt-4 rounded-2xl border p-4 ${t.box}`}>
      <div className="flex items-center gap-3">
        {Icon && (
          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${t.icon}`}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h3 id={id} className="text-sm font-semibold leading-snug text-foreground">
            {title}
          </h3>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Progresso (opcional)                                                */
/* ------------------------------------------------------------------ */

export type ProgressStep = {
  label: string;
  state: "done" | "current" | "upcoming" | "error";
  /** Ícone mostrado nos passos "current"/"upcoming" (por omissão, um ponto). */
  icon?: LucideIcon | undefined;
};

const STEP_CIRCLE: Record<ProgressStep["state"], string> = {
  done: "bg-success/15 text-success ring-success/30",
  current: "bg-primary/15 text-primary ring-primary/50",
  upcoming: "bg-surface text-muted-foreground ring-border",
  error: "bg-destructive/15 text-destructive ring-destructive/30",
};

const STEP_LABEL: Record<ProgressStep["state"], string> = {
  done: "font-medium text-foreground",
  current: "font-bold text-foreground",
  upcoming: "font-medium text-muted-foreground",
  error: "font-bold text-destructive",
};

const STEP_SR: Record<ProgressStep["state"], string> = {
  done: "concluído",
  current: "passo atual",
  upcoming: "por fazer",
  error: "com problema",
};

/** Barra de progresso do registo (ex.: Recebido → Aceite → A caminho →
 * Entregue). Puramente visual: quem chama decide os passos e o estado de
 * cada um. Use dentro de `DetailSection` ou solto. */
export function DetailProgress({
  steps,
  label = "Progresso",
}: {
  steps: ProgressStep[];
  label?: string | undefined;
}) {
  return (
    <ol aria-label={label} className="mt-5 flex items-start">
      {steps.map((step, i) => {
        const reached = step.state !== "upcoming";
        const leftFilled = reached && i > 0;
        const rightFilled = step.state === "done" && i < steps.length - 1;
        const Icon = step.icon;
        return (
          <li
            key={`${i}-${step.label}`}
            aria-current={step.state === "current" ? "step" : undefined}
            className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
          >
            <div className="flex w-full items-center">
              <span
                className={`h-0.5 flex-1 rounded-full ${i === 0 ? "bg-transparent" : leftFilled ? "bg-success/50" : "bg-border"}`}
              />
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ring-1 ring-inset ${STEP_CIRCLE[step.state]} ${step.state === "current" ? "ring-2" : ""}`}
              >
                {step.state === "done" ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                ) : step.state === "error" ? (
                  <X className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                ) : Icon ? (
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <span
                    aria-hidden="true"
                    className={`h-2 w-2 rounded-full bg-current ${step.state === "current" ? "motion-safe:animate-pulse" : "opacity-40"}`}
                  />
                )}
              </span>
              <span
                className={`h-0.5 flex-1 rounded-full ${i === steps.length - 1 ? "bg-transparent" : rightFilled ? "bg-success/50" : "bg-border"}`}
              />
            </div>
            <span
              className={`px-0.5 text-center text-[11px] leading-tight ${STEP_LABEL[step.state]}`}
            >
              {step.label}
              <span className="sr-only"> ({STEP_SR[step.state]})</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------------------------------------------------ */
/* Total                                                               */
/* ------------------------------------------------------------------ */

/** Linha final do total — o facto mais consultado do card e o único
 * elemento "herói": tile de ícone, rótulo + nota opcional (ex.: "IVA
 * incluído") e valor em números tabulares, para alinhar entre pedidos. */
export function DetailTotal({
  label,
  value,
  hint,
  icon: Icon = Receipt,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon | undefined;
}) {
  return (
    <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-primary/10 p-4 ring-1 ring-inset ring-primary/20">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{label}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </div>
      <p className="shrink-0 font-display text-2xl font-extrabold tabular-nums text-primary">
        {value}
      </p>
    </div>
  );
}
