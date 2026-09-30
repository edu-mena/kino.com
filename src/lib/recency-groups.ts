import { weekStart } from "@/lib/week";

/**
 * Separadores de data das listas (Pedidos, Reservas, Notificações): cada item
 * cai no primeiro balde, por esta ordem, cujo início é anterior à sua data de
 * modificação. A semana começa à segunda (mesmo `weekStart` dos gráficos do
 * painel). Baldes que se sobrepõem (ex.: a semana passada começou no mês
 * passado) resolvem-se pela ordem — o mais específico ganha.
 */
export const RECENCY_BUCKETS = [
  "today",
  "yesterday",
  "earlierThisWeek",
  "lastWeek",
  "earlierThisMonth",
  "lastMonth",
  "earlierThisYear",
  "lastYear",
  "older",
] as const;

export type RecencyBucket = (typeof RECENCY_BUCKETS)[number];

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function recencyBucket(date: Date, now: Date = new Date()): RecencyBucket {
  const t = date.getTime();
  const today = startOfDay(now);
  // Relógio do dispositivo ligeiramente atrás do servidor → data "no futuro".
  if (t >= today.getTime()) return "today";
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (t >= yesterday.getTime()) return "yesterday";
  const thisWeek = weekStart(now);
  if (t >= thisWeek.getTime()) return "earlierThisWeek";
  const lastWeek = new Date(thisWeek);
  lastWeek.setDate(lastWeek.getDate() - 7);
  if (t >= lastWeek.getTime()) return "lastWeek";
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  if (t >= thisMonth.getTime()) return "earlierThisMonth";
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  if (t >= lastMonth.getTime()) return "lastMonth";
  const thisYear = new Date(now.getFullYear(), 0, 1);
  if (t >= thisYear.getTime()) return "earlierThisYear";
  const lastYear = new Date(now.getFullYear() - 1, 0, 1);
  if (t >= lastYear.getTime()) return "lastYear";
  return "older";
}

export type RecencyGroup<T> = { bucket: RecencyBucket; items: T[] };

/**
 * Agrupa `items` por balde, preservando a ordem de entrada dentro de cada
 * grupo (quem chama decide a ordenação — normalmente mais recente primeiro).
 * Os grupos saem na ordem de `RECENCY_BUCKETS`; baldes vazios não aparecem.
 */
export function groupByRecency<T>(
  items: readonly T[],
  getDate: (item: T) => Date,
  now: Date = new Date(),
): RecencyGroup<T>[] {
  const byBucket = new Map<RecencyBucket, T[]>();
  for (const item of items) {
    const bucket = recencyBucket(getDate(item), now);
    const list = byBucket.get(bucket);
    if (list) list.push(item);
    else byBucket.set(bucket, [item]);
  }
  return RECENCY_BUCKETS.filter((b) => byBucket.has(b)).map((bucket) => ({
    bucket,
    items: byBucket.get(bucket)!,
  }));
}

/** Data ISO → `Date`, com recuo para época 0 quando ausente/inválida (vai para "older"). */
export function parseIsoDate(iso: string | undefined | null): Date {
  const d = iso ? new Date(iso) : new Date(0);
  return Number.isNaN(d.getTime()) ? new Date(0) : d;
}

/** Data mais recente entre várias ISO (ignora ausentes). */
export function latestIsoDate(...isos: (string | undefined | null)[]): Date {
  return isos.reduce<Date>((acc, iso) => {
    const d = parseIsoDate(iso);
    return d.getTime() > acc.getTime() ? d : acc;
  }, new Date(0));
}

/**
 * Data de modificação de um pedido/reserva: a mais recente entre a criação e
 * os eventos com carimbo próprio (mudança de estado, entrega, comprovativo,
 * fatura). Tipo estrutural — serve `CartOrder` e `Reservation`.
 */
export function modifiedAt(x: {
  createdAt?: string | undefined;
  statusUpdatedAt?: string | undefined;
  deliveredAt?: string | undefined;
  paymentProofAt?: string | undefined;
  invoiceAt?: string | undefined;
}): Date {
  return latestIsoDate(
    x.createdAt,
    x.statusUpdatedAt,
    x.deliveredAt,
    x.paymentProofAt,
    x.invoiceAt,
  );
}
