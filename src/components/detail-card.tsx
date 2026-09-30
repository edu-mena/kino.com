import {
  BadgeCheck,
  Bike,
  Check,
  ChefHat,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  Clock,
  ConciergeBell,
  Info,
  MessageCircle,
  Package,
  Phone,
  Receipt,
  TriangleAlert,
  Truck,
  UtensilsCrossed,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import type { CartOrderStatus } from "@/lib/cart";

/**
 * Primitivos partilhados do card de detalhe de um registo (pedido/reserva,
 * lado do cliente E do restaurante).
 *
 * Princípios de design aplicados:
 *  1. Hierarquia por contraste — o valor é sempre mais forte que o rótulo
 *     (rótulo: pequeno, cinza; valor: maior, foreground, semibold).
 *  2. Progresso visível — o estado do pedido é uma linha de passos (feito /
 *     agora / por fazer), não uma etiqueta: responde a "em que ponto estou?"
 *     sem ler texto.
 *  3. Cor com significado — o tom vem do estado (tinta + anel + ÍCONE), nunca
 *     só da cor, para não depender de perceção cromática (WCAG 1.4.1).
 *  4. Agrupamento (Gestalt) — factos num card, secções em subcards com
 *     cabeçalho próprio, produtos com foto, e um único elemento "herói": o total.
 *  5. Robustez — textos longos quebram em vez de rebentar o layout; imagens
 *     partidas caem para um ícone; o cabeçalho reflui em ecrãs estreitos.
 *  6. Acessibilidade — landmarks/headings, `aria-hidden` nos ícones
 *     decorativos, `aria-current` no passo atual, `motion-safe` nas animações.
 *
 * Só apresentação — nenhuma lógica de negócio. A API anterior mantém-se
 * compatível: tudo o que foi acrescentado é opcional.
 */

/** Cor do texto/ícone sobre fundos sólidos `bg-primary` / `bg-destructive`.
 * Se tiveres o token `primary-foreground`, troca aqui (um só sítio). */
const ON_SOLID = "text-white";

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
 * de ecrã anunciem a mudança quando o estado é atualizado em tempo real.
 * Para pedidos em curso prefere `DetailProgress`; o badge fica para estados
 * finais (recusado, cancelado) e para o estado do restaurante ("Aberto"). */
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

/** Pequena etiqueta neutra (ex.: nº do pedido, "1 item") para o slot `meta`
 * do cabeçalho ou para o `action` de uma secção. */
export function DetailChip({
  icon: Icon,
  children,
}: {
  icon?: LucideIcon | undefined;
  children: ReactNode;
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
      {Icon && <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />}
      <span className="truncate">{children}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Imagem com fallback                                                 */
/* ------------------------------------------------------------------ */

/** Miniatura que nunca deixa um buraco: sem `src`, ou se a imagem falhar a
 * carregar (URL partido, upload apagado), mostra um tile com ícone — ou nada,
 * se não houver ícone. `className` traz tamanho e raio. */
function Thumb({
  src,
  Fallback,
  className,
  iconClassName,
}: {
  src?: string | undefined;
  Fallback?: LucideIcon | undefined;
  className: string;
  iconClassName: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | undefined>(undefined);
  if (src && failedSrc !== src) {
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        onError={() => setFailedSrc(src)}
        className={`object-cover ring-1 ring-border/60 ${className}`}
      />
    );
  }
  if (!Fallback) return null;
  return (
    <span
      className={`grid place-items-center bg-primary/10 text-primary ring-1 ring-inset ring-primary/15 ${className}`}
    >
      <Fallback className={iconClassName} aria-hidden="true" />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Cabeçalho                                                           */
/* ------------------------------------------------------------------ */

/** Cabeçalho do card — imagem (ou ícone) + etiqueta de papel + título
 * (restaurante ou cliente) + data/hora/pessoas + subtítulo + chips, com um
 * badge à direita (ex.: "Aberto") e, opcionalmente, outra ação (ex. o popover
 * de contacto). Em ecrãs estreitos o badge reflui para a linha de baixo em
 * vez de espremer o título.
 *
 * `eyebrow` diz de quem é o nome ("Restaurante" / "Cliente") — o mesmo card
 * serve os dois lados, e assim ninguém tem de adivinhar.
 *
 * Data, hora e nº de pessoas aparecem como texto simples, logo por baixo do
 * título, sem rótulo nem ícone: a data numa linha e, na linha seguinte, a hora
 * seguida de " - " e das pessoas. Cada parte é opcional (ex.: um pedido de
 * entrega não tem `people`); a linha da hora só aparece se houver hora ou
 * pessoas. Os textos já vêm formatados/traduzidos por quem chama. */
export function DetailHeader({
  image,
  icon: FallbackIcon,
  eyebrow,
  title,
  date,
  time,
  people,
  subtitle,
  subtitleIcon: SubtitleIcon,
  meta,
  status,
  extra,
  imageSize = "md",
}: {
  /** `lg` (96px) quando a imagem identifica o sítio (restaurante); `md`
   * (72px) para o resto. */
  imageSize?: "md" | "lg" | undefined;
  image?: string | undefined;
  /** Ícone mostrado num tile quando não há imagem (ou ela falha). */
  icon?: LucideIcon | undefined;
  /** Etiqueta pequena por cima do título (ex.: "Restaurante", "Cliente"). */
  eyebrow?: ReactNode;
  title: ReactNode;
  /** Data, já formatada (ex.: "28 set 2026"). */
  date?: ReactNode;
  /** Hora, já formatada (ex.: "19:30"). */
  time?: ReactNode;
  /** Nº de pessoas, já com a unidade traduzida (ex.: "4 pessoas"). */
  people?: ReactNode;
  subtitle?: ReactNode;
  /** Ícone à esquerda do subtítulo (ex.: `MapPin` para a localização). */
  subtitleIcon?: LucideIcon | undefined;
  /** Linha de chips/factos rápidos por baixo do subtítulo (ver `DetailChip`). */
  meta?: ReactNode;
  status?: ReactNode;
  extra?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start gap-x-3.5 gap-y-3">
      <div className="flex min-w-0 flex-1 basis-56 items-start gap-3.5">
        <Thumb
          src={image}
          Fallback={FallbackIcon}
          className={`shrink-0 rounded-2xl shadow-sm ${imageSize === "lg" ? "h-24 w-24" : "h-[72px] w-[72px]"}`}
          iconClassName="h-8 w-8"
        />
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <p className="truncate text-[11px] font-bold uppercase tracking-wider text-primary/70">
              {eyebrow}
            </p>
          )}
          <h2 className="line-clamp-2 break-words font-display text-xl font-extrabold leading-tight text-primary">
            {title}
          </h2>
          {(date || time || people) && (
            <div className="mt-1 text-sm font-medium tabular-nums text-muted-foreground">
              {date && <p className="truncate">{date}</p>}
              {(time || people) && (
                <p className="truncate">
                  {time}
                  {time && people ? " - " : null}
                  {people}
                </p>
              )}
            </div>
          )}
          {subtitle && (
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              {SubtitleIcon && <SubtitleIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
              <span className="truncate">{subtitle}</span>
            </p>
          )}
          {meta && <div className="mt-2 flex flex-wrap items-center gap-1.5">{meta}</div>}
        </div>
      </div>
      {(status || extra) && (
        <div className="flex shrink-0 items-center gap-2">
          {extra}
          {status}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Progresso                                                           */
/* ------------------------------------------------------------------ */

export type ProgressStep = {
  label: string;
  state: "done" | "current" | "upcoming" | "error";
  /** Ícone mostrado nos passos "current"/"upcoming" (os "done" mostram ✓). */
  icon?: LucideIcon | undefined;
  /** Texto pequeno por baixo do rótulo — a hora em que o passo foi cumprido,
   * ou "Agora" no passo atual. */
  caption?: ReactNode;
};

const STEP_CIRCLE: Record<ProgressStep["state"], string> = {
  done: `h-9 w-9 bg-primary ${ON_SOLID}`,
  current: `h-11 w-11 bg-primary ${ON_SOLID} ring-4 ring-primary/20`,
  upcoming: "h-9 w-9 bg-surface text-muted-foreground ring-1 ring-inset ring-border",
  error: `h-9 w-9 bg-destructive ${ON_SOLID}`,
};

const STEP_LABEL: Record<ProgressStep["state"], string> = {
  done: "font-semibold text-foreground",
  current: "font-bold text-primary",
  upcoming: "font-medium text-muted-foreground",
  error: "font-bold text-destructive",
};

const STEP_SR: Record<ProgressStep["state"], string> = {
  done: "concluído",
  current: "passo atual",
  upcoming: "por fazer",
  error: "com problema",
};

/** Linha de passos do registo (Pendente → Em preparação → Pronto →
 * Concluído): passos cumpridos a cheio com ✓, o passo atual maior e com
 * halo, os restantes só em contorno. Puramente visual — quem chama decide os
 * passos e o estado de cada um (ver `orderProgressSteps` para pedidos).
 * Usa-se solto, logo abaixo do cabeçalho: já traz o seu próprio fundo. */
export function DetailProgress({
  steps,
  label = "Progresso",
}: {
  steps: ProgressStep[];
  label?: string | undefined;
}) {
  return (
    <ol aria-label={label} className="mt-6 flex items-start">
      {steps.map((step, i) => {
        const reached = step.state !== "upcoming";
        const leftFilled = reached && i > 0;
        const rightFilled = step.state === "done" && i < steps.length - 1;
        const Icon = step.icon;
        return (
          <li
            key={`${i}-${step.label}`}
            aria-current={step.state === "current" ? "step" : undefined}
            className="flex min-w-0 flex-1 flex-col items-center"
          >
            {/* Altura fixa: todos os círculos ficam centrados na mesma linha,
                mesmo com o passo atual maior — as barras nunca "saltam". */}
            <div className="flex h-11 w-full items-center">
              <span
                className={`h-0.5 flex-1 rounded-full ${i === 0 ? "bg-transparent" : leftFilled ? "bg-primary" : "bg-border"}`}
              />
              <span
                className={`grid shrink-0 place-items-center rounded-full ${STEP_CIRCLE[step.state]}`}
              >
                {step.state === "done" ? (
                  <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
                ) : step.state === "error" ? (
                  <X className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
                ) : Icon ? (
                  <Icon
                    className={step.state === "current" ? "h-5 w-5" : "h-4 w-4"}
                    aria-hidden="true"
                  />
                ) : (
                  <span aria-hidden="true" className="h-2 w-2 rounded-full bg-current" />
                )}
              </span>
              <span
                className={`h-0.5 flex-1 rounded-full ${i === steps.length - 1 ? "bg-transparent" : rightFilled ? "bg-primary" : "bg-border"}`}
              />
            </div>
            <span
              className={`mt-2 px-0.5 text-center text-xs leading-tight ${STEP_LABEL[step.state]}`}
            >
              {step.label}
              <span className="sr-only"> ({STEP_SR[step.state]})</span>
            </span>
            {step.caption && (
              <span
                className={`mt-0.5 text-center text-[11px] leading-tight tabular-nums ${step.state === "current" ? "font-semibold text-primary" : "text-muted-foreground"}`}
              >
                {step.caption}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Fluxo do pedido: `delivery` (Pendente → Em preparação → A caminho →
 * Entregue) ou `pickup` (Pendente → Em preparação → Pronto → Concluído,
 * serve takeaway e consumo no local). Só muda o ícone de cada passo; os
 * rótulos vêm traduzidos de fora. */
export type OrderFlow = "delivery" | "pickup";

/** Posição de cada estado nos 4 passos. `rejected`/`canceled` não têm
 * posição — o pedido saiu do fluxo. */
const ORDER_STEP_INDEX: Record<CartOrderStatus, number | null> = {
  pending: 0,
  accepted: 1,
  onTheWay: 2,
  ready: 2,
  delivered: 3,
  completed: 3,
  rejected: null,
  canceled: null,
};

const ORDER_STEP_ICONS: Record<OrderFlow, readonly LucideIcon[]> = {
  delivery: [Clock, ChefHat, Truck, CircleCheck],
  pickup: [Clock, ChefHat, ConciergeBell, CircleCheck],
};

/** Converte o estado de um pedido nos 4 passos de `DetailProgress`.
 * Devolve `null` para `rejected`/`canceled` — nesses casos mostra antes um
 * `StatusBadge` (e, se quiseres, uma `DetailNote`).
 *
 *   <DetailProgress steps={orderProgressSteps({
 *     status: order.status,
 *     flow: order.mode === "delivery" ? "delivery" : "pickup",
 *     labels: [t("pendente"), t("emPreparacao"), t("pronto"), t("concluido")],
 *     captions: [confirmadoAs],       // opcional: hora de cada passo cumprido
 *     currentCaption: t("agora"),     // opcional: texto do passo atual
 *   })} /> */
export function orderProgressSteps({
  status,
  flow = "pickup",
  labels,
  captions,
  currentCaption,
}: {
  status: CartOrderStatus;
  flow?: OrderFlow | undefined;
  /** Rótulos já traduzidos, pela ordem dos 4 passos. */
  labels: readonly [string, string, string, string];
  /** Legenda opcional por passo (ex.: hora em que foi cumprido). */
  captions?: readonly ReactNode[] | undefined;
  /** Legenda do passo atual quando `captions` não a traz (ex.: "Agora"). */
  currentCaption?: ReactNode;
}): ProgressStep[] | null {
  const index = ORDER_STEP_INDEX[status];
  if (index === null) return null;
  const finished = index === labels.length - 1;
  return labels.map((label, i) => {
    const state: ProgressStep["state"] =
      finished || i < index ? "done" : i === index ? "current" : "upcoming";
    return {
      label,
      state,
      icon: ORDER_STEP_ICONS[flow][i],
      caption: captions?.[i] ?? (state === "current" ? currentCaption : undefined),
    };
  });
}

/* ------------------------------------------------------------------ */
/* Factos                                                              */
/* ------------------------------------------------------------------ */

/** Card de factos em grelha de 2 colunas — agrupa os dados de contexto
 * (método, contacto, pagamento...) num bloco com contenção visual. Opcional:
 * um `<dl className="grid grid-cols-2 gap-x-4 gap-y-4">` escrito à mão
 * continua a funcionar tal e qual. */
export function DetailFacts({ children }: { children: ReactNode }) {
  return (
    <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border/60 pt-5">
      {children}
    </dl>
  );
}

/** Cor do ícone da linha — cinza por omissão; só um facto com significado
 * (pagamento em falta, fora da zona…) ganha cor. */
const ROW_ICON_TONE = {
  default: "text-muted-foreground",
  brand: "text-brand",
  success: "text-success",
  danger: "text-destructive",
} as const;

/** Par rótulo/valor com ícone âncora. O valor tem sempre mais peso que o
 * rótulo (hierarquia), e quebra em qualquer ponto para nunca rebentar a
 * grelha com e-mails ou moradas longas. `hint` é a frase de apoio por baixo
 * do valor (ex.: "O restaurante define o método no momento da entrega");
 * `tone` destaca um facto crítico (ex.: pagamento em falta). Um botão ou uma
 * caixa (ex.: `DetailAction`) pode ir como segundo filho. */
export function DetailRow({
  icon: Icon,
  label,
  span,
  tone = "default",
  hint,
  children,
}: {
  icon: LucideIcon;
  label: string;
  span?: boolean | undefined;
  tone?: keyof typeof ROW_ICON_TONE | undefined;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={`flex min-w-0 items-start gap-2.5 ${span ? "col-span-full" : ""}`}>
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${ROW_ICON_TONE[tone]}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 text-sm font-semibold leading-snug text-foreground [overflow-wrap:anywhere]">
          {children}
        </dd>
        {hint && (
          <dd className="mt-0.5 text-xs leading-snug text-muted-foreground [overflow-wrap:anywhere]">
            {hint}
          </dd>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ações e notas                                                       */
/* ------------------------------------------------------------------ */

const ACTION_VARIANT = {
  outline: "bg-primary/10 text-primary ring-1 ring-inset ring-primary/25 hover:bg-primary/15",
  solid: `bg-primary ${ON_SOLID} hover:bg-primary/90`,
} as const;

/** Botão em pílula para ações do card (ex.: "Falar com o restaurante" no
 * WhatsApp, "Acompanhar pedido"). Com `href` renderiza um `<a>` (com
 * `external` abre noutro separador, com `rel` seguro); sem `href`, um
 * `<button type="button">`. `block` ocupa a largura toda. */
export function DetailAction({
  icon: Icon,
  variant = "outline",
  block,
  href,
  external,
  onClick,
  children,
}: {
  icon?: LucideIcon | undefined;
  variant?: keyof typeof ACTION_VARIANT | undefined;
  block?: boolean | undefined;
  href?: string | undefined;
  external?: boolean | undefined;
  onClick?: (() => void) | undefined;
  children: ReactNode;
}) {
  const className = `inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${block ? "w-full" : ""} ${ACTION_VARIANT[variant]}`;
  const content = (
    <>
      {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />}
      {children}
    </>
  );
  if (href) {
    return (
      <a
        href={href}
        className={className}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {content}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

type NoteTone = "neutral" | "success" | "warning" | "danger";

/** Nota neutra = só ícone e texto (informação, não alerta). As restantes
 * têm um fundo suave porque a cor ali É o significado — mas nunca borda. */
const NOTE_TONE: Record<NoteTone, { box: string; icon: string; Icon: LucideIcon }> = {
  neutral: { box: "", icon: "text-muted-foreground", Icon: Info },
  success: { box: "rounded-xl bg-success/10 px-3.5 py-3", icon: "text-success", Icon: CircleCheck },
  warning: { box: "rounded-xl bg-brand/10 px-3.5 py-3", icon: "text-brand", Icon: TriangleAlert },
  danger: {
    box: "rounded-xl bg-destructive/10 px-3.5 py-3",
    icon: "text-destructive",
    Icon: CircleAlert,
  },
};

/** Faixa de mensagem com ícone — substitui o texto solto colorido e a caixa
 * tracejada de rodapé: confirmações ("Comprovativo enviado ao restaurante"),
 * avisos ("Pedido já aceito — contacte o restaurante para cancelar") e
 * agradecimentos. `title` opcional a negrito; `action` à direita (ex.:
 * "Substituir"); `className` sobrepõe a margem (por omissão `mt-4`). */
export function DetailNote({
  icon,
  tone = "neutral",
  title,
  action,
  className = "mt-4",
  children,
}: {
  icon?: LucideIcon | undefined;
  tone?: NoteTone | undefined;
  title?: ReactNode;
  action?: ReactNode;
  className?: string | undefined;
  children: ReactNode;
}) {
  const t = NOTE_TONE[tone];
  const Icon = icon ?? t.Icon;
  return (
    <div className={`flex items-start gap-2.5 text-sm ${t.box} ${className}`}>
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${t.icon}`} aria-hidden="true" />
      <div className="min-w-0 flex-1 leading-snug">
        {title && <p className="font-semibold text-foreground">{title}</p>}
        <div className={title ? "text-muted-foreground" : "font-medium text-foreground"}>
          {children}
        </div>
      </div>
      {action && (
        <div className="shrink-0 text-xs font-semibold text-muted-foreground">{action}</div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Secções                                                             */
/* ------------------------------------------------------------------ */

type SectionTone = "default" | "warning" | "danger";

/** Secção normal = sem caixa: só o título e uma linha fina por cima,
 * dentro da mesma superfície do card. Caixa (fundo suave, sem borda) só
 * para o que pede atenção — aviso ou perigo. */
const SECTION_TONE: Record<SectionTone, { box: string; icon: string; fallback?: LucideIcon }> = {
  default: {
    box: "mt-5 border-t border-border/60 pt-5",
    icon: "text-muted-foreground",
  },
  warning: {
    box: "mt-4 rounded-2xl bg-brand/10 p-4",
    icon: "text-brand",
    fallback: TriangleAlert,
  },
  danger: {
    box: "mt-4 rounded-2xl bg-destructive/10 p-4",
    icon: "text-destructive",
    fallback: CircleAlert,
  },
};

/** Subcard para os blocos secundários (produtos, comprovativo, fatura, mapa,
 * estafeta, pedidos especiais...). Cabeçalho próprio com ícone em tile,
 * título legível (sentence case, foreground) e slot de ação à direita — que
 * também serve para um contador (`<DetailChip>1 item</DetailChip>`). Os tons
 * `warning` e `danger` trazem ícone por omissão — o significado nunca
 * depende só da cor. É uma `<section>` etiquetada pelo seu título (`h3`,
 * abaixo do `h2` do cabeçalho). */
export function DetailSection({
  icon,
  title,
  description,
  action,
  tone = "default",
  collapsible = false,
  defaultOpen = false,
  solidWhenCollapsed = false,
  children,
}: {
  icon?: LucideIcon | undefined;
  title: ReactNode;
  /** Frase de apoio por baixo do título. */
  description?: ReactNode;
  /** Ação secundária alinhada à direita do cabeçalho (ex.: "Ver mapa"). */
  action?: ReactNode;
  tone?: SectionTone | undefined;
  /** Informação secundária (mapa, documentos já tratados…): o cabeçalho
   * vira um botão e o conteúdo só aparece quando pedido — o card mostra
   * primeiro o que importa (divulgação progressiva). */
  collapsible?: boolean | undefined;
  defaultOpen?: boolean | undefined;
  /** Minimizada, a secção fica a cheio na cor principal — continua bem
   * visível (ex.: produtos do pedido) em vez de desaparecer no fundo. */
  solidWhenCollapsed?: boolean | undefined;
  children: ReactNode;
}) {
  const id = useId();
  const [open, setOpen] = useState(defaultOpen);
  const t = SECTION_TONE[tone];
  const Icon = icon ?? t.fallback;
  const expanded = !collapsible || open;
  const solid = collapsible && solidWhenCollapsed && !open;
  const heading = (
    <>
      {Icon && (
        <Icon className={`h-4 w-4 shrink-0 ${solid ? ON_SOLID : t.icon}`} aria-hidden="true" />
      )}
      <span className="min-w-0 flex-1 text-left">
        <span
          id={id}
          className={`block text-sm font-semibold leading-snug ${solid ? ON_SOLID : "text-foreground"}`}
        >
          {title}
        </span>
        {description && (
          <span className={`block text-xs ${solid ? "text-white/80" : "text-muted-foreground"}`}>
            {description}
          </span>
        )}
      </span>
    </>
  );
  return (
    <section
      aria-labelledby={id}
      className={`transition-colors ${solid ? "mt-5 rounded-2xl bg-primary p-4" : t.box}`}
    >
      <h3 className="flex items-center gap-3">
        {collapsible ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className={`-m-1 flex min-w-0 flex-1 items-center gap-2.5 rounded-xl p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 ${solid ? "hover:bg-white/10 focus-visible:ring-white/60" : "hover:bg-surface/80 focus-visible:ring-primary/40"}`}
          >
            {heading}
            <ChevronDown
              className={`h-4 w-4 shrink-0 transition-transform ${solid ? ON_SOLID : "text-muted-foreground"} ${open ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>
        ) : (
          <span className="flex min-w-0 flex-1 items-center gap-2.5">{heading}</span>
        )}
        {action && <span className="shrink-0">{action}</span>}
      </h3>
      {expanded && <div className="mt-3">{children}</div>}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Produtos                                                            */
/* ------------------------------------------------------------------ */

/** Lista de produtos de um pedido — usa-se dentro de `DetailSection`, com
 * `DetailProductRow` como filhos. */
export function DetailProductList({ children }: { children: ReactNode }) {
  return <ul className="divide-y divide-border/60">{children}</ul>;
}

/** Linha de produto: foto do prato + nome + descrição + preço + quantidade.
 * Sem foto (ou se falhar), mostra um tile com ícone para as linhas
 * continuarem alinhadas. `children` são as personalizações (ex.: chips
 * "sem cebola", "+ queijo") por baixo da descrição. */
export function DetailProductRow({
  image,
  name,
  description,
  price,
  quantity,
  compact = false,
  children,
}: {
  image?: string | undefined;
  name: ReactNode;
  /** Ingredientes ou porção, em texto pequeno (máx. 2 linhas). */
  description?: ReactNode;
  price: ReactNode;
  /** Quantidade, já formatada (ex.: "1x"). */
  quantity?: ReactNode;
  /** Versão do painel (cozinha): miniatura pequena, sem descrição — a
   * quantidade e o nome é que se leem de relance. */
  compact?: boolean | undefined;
  children?: ReactNode;
}) {
  return (
    <li className={`flex items-start gap-3 first:pt-0 last:pb-0 ${compact ? "py-2.5" : "py-3"}`}>
      <Thumb
        src={image}
        Fallback={UtensilsCrossed}
        className={`shrink-0 ${compact ? "h-10 w-10 rounded-lg" : "h-16 w-16 rounded-xl"}`}
        iconClassName={compact ? "h-4 w-4" : "h-6 w-6"}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug text-foreground">{name}</p>
        {description && (
          <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground">
            {description}
          </p>
        )}
        {children && <div className="mt-1.5 flex flex-wrap gap-1">{children}</div>}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <p className="text-sm font-bold tabular-nums text-foreground">{price}</p>
        {quantity && (
          <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground ring-1 ring-inset ring-border/60">
            {quantity}
          </span>
        )}
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Total                                                               */
/* ------------------------------------------------------------------ */

/** Linha final do total — o facto mais consultado do card e o único
 * elemento "herói": tile de ícone, rótulo + nota opcional (ex.: "IVA
 * incluído") e valor em números tabulares, para alinhar entre pedidos. */
export type BreakdownLine = {
  label: ReactNode;
  value: ReactNode;
  /** `credit` = desconto/crédito (verde); `muted` = parcela normal. */
  tone?: "muted" | "credit" | undefined;
};

export function DetailTotal({
  label,
  value,
  hint,
  icon: Icon = Receipt,
  breakdown,
  showBreakdownLabel,
  hideBreakdownLabel,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon | undefined;
  /** Parcelas do valor (subtotal, taxa de entrega, descontos). Ficam
   * recolhidas por omissão: quase ninguém precisa delas para acompanhar o
   * pedido, e quem precisa abre com um toque. */
  breakdown?: BreakdownLine[] | undefined;
  showBreakdownLabel?: string | undefined;
  hideBreakdownLabel?: string | undefined;
}) {
  const [open, setOpen] = useState(false);
  const hasBreakdown = !!breakdown && breakdown.length > 0;
  return (
    <div className="mt-5 rounded-2xl bg-primary/[0.07] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{label}</p>
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
            {hasBreakdown && (
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="mt-0.5 inline-flex items-center gap-0.5 text-xs font-semibold text-primary hover:underline"
              >
                {open ? hideBreakdownLabel : showBreakdownLabel}
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>
            )}
          </div>
        </div>
        <p className="shrink-0 font-display text-2xl font-extrabold tabular-nums text-primary">
          {value}
        </p>
      </div>
      {hasBreakdown && open && (
        <dl className="mt-3 space-y-1.5 border-t border-primary/10 pt-3 text-sm">
          {breakdown.map((line, i) => (
            <div
              key={i}
              className={`flex items-start justify-between gap-3 ${line.tone === "credit" ? "font-semibold text-success" : "text-muted-foreground"}`}
            >
              <dt className="min-w-0">{line.label}</dt>
              <dd className="shrink-0 tabular-nums">{line.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Agenda (reservas)                                                   */
/* ------------------------------------------------------------------ */

/** Faixa "quando e quantos" de uma reserva — Data · Hora · Pessoas em três
 * células iguais, com o valor em destaque. É o que o cliente e o
 * restaurante procuram primeiro numa reserva, por isso vem logo a seguir ao
 * cabeçalho (o mesmo lugar da linha de progresso nos pedidos). */
export function DetailSchedule({
  items,
}: {
  items: { icon: LucideIcon; label: string; value: ReactNode }[];
}) {
  return (
    <dl className="mt-6 grid grid-cols-3 divide-x divide-border/60">
      {items.map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex min-w-0 flex-col items-center gap-1 px-2 text-center">
          <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
          <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </dt>
          <dd className="max-w-full truncate text-sm font-bold tabular-nums text-foreground">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/* ------------------------------------------------------------------ */
/* Contacto                                                            */
/* ------------------------------------------------------------------ */

/** Link de WhatsApp a partir de um telefone angolano (com ou sem 244). */
export function whatsappUrl(phone: string | undefined | null): string | null {
  const digits = phone?.replace(/\D/g, "") ?? "";
  if (!digits) return null;
  return `https://wa.me/${digits.startsWith("244") ? digits : `244${digits}`}`;
}

/** Botões redondos "Ligar" e "WhatsApp" para o slot `extra` do cabeçalho —
 * substituem o antigo popover de contacto: ligar ao cliente/restaurante é
 * uma ação frequente, não devia estar escondida atrás de um clique a mais. */
export function DetailContactButtons({
  phone,
  callLabel,
  whatsappLabel,
}: {
  phone: string | undefined | null;
  callLabel: string;
  whatsappLabel: string;
}) {
  const wa = whatsappUrl(phone);
  if (!phone || !wa) return null;
  const btn =
    "grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary ring-1 ring-inset ring-primary/20 transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50";
  return (
    <>
      <a
        href={`tel:${phone.replace(/\s/g, "")}`}
        aria-label={callLabel}
        title={callLabel}
        className={btn}
      >
        <Phone className="h-4 w-4" aria-hidden="true" />
      </a>
      <a
        href={wa}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={whatsappLabel}
        title={whatsappLabel}
        className={btn}
      >
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
      </a>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Documentos                                                          */
/* ------------------------------------------------------------------ */

export type DetailDocument = {
  key: string;
  icon: LucideIcon;
  title: string;
  /** Estado curto por baixo do título (ex.: "Enviado", "A aguardar"). */
  status: ReactNode;
  /** `done` = verde; `pending` = neutro; `action` = precisa de algo (laranja). */
  tone?: "done" | "pending" | "action" | undefined;
  /** O que o documento guarda — aparece por baixo das colunas ao clicar. */
  content: ReactNode;
};

const DOC_STATUS_TONE = {
  done: "text-success",
  pending: "text-muted-foreground",
  action: "text-brand",
} as const;

/** Comprovativo e fatura lado a lado, em duas colunas: cada um mostra só o
 * título e o estado; clicar num abre o que ele guarda logo por baixo das
 * colunas (e fecha o outro). Com um só documento, ocupa a largura toda. */
export function DetailDocuments({ items }: { items: DetailDocument[] }) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const panelId = useId();
  if (items.length === 0) return null;
  const open = items.find((i) => i.key === openKey);
  return (
    <div className="mt-4">
      <div className={`grid gap-3 ${items.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
        {items.map((item) => {
          const selected = item.key === openKey;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setOpenKey((k) => (k === item.key ? null : item.key))}
              aria-expanded={selected}
              aria-controls={panelId}
              className={`flex min-w-0 items-center gap-2.5 rounded-2xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                selected
                  ? "border-primary/40 bg-primary/5 ring-1 ring-inset ring-primary/20"
                  : "border-border/70 hover:border-primary/40 hover:bg-surface/60"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-foreground">
                  {item.title}
                </span>
                <span
                  className={`block truncate text-xs font-medium ${DOC_STATUS_TONE[item.tone ?? "pending"]}`}
                >
                  {item.status}
                </span>
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${selected ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>
      {open && (
        <div id={panelId} className="mt-3">
          {open.content}
        </div>
      )}
    </div>
  );
}
