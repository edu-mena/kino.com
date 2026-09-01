import type { CartOrderStatus } from "@/lib/cart";
import type { useTranslation } from "@/i18n";

/**
 * Fonte única dos estados de pedido e reserva — rótulo, cor, cor de barra e
 * ordem canónica. Antes estava duplicado em ~8 páginas.
 */
type T = ReturnType<typeof useTranslation>["t"];
export type StatusMeta = { label: string; tone: string; barTone: string; rank: number };

export const ORDER_STATUSES: CartOrderStatus[] = [
  "pending",
  "accepted",
  "onTheWay",
  "delivered",
  "rejected",
  "canceled",
];

const ORDER_TONE: Record<CartOrderStatus, string> = {
  pending: "bg-brand/15 text-brand",
  accepted: "bg-primary/15 text-primary",
  onTheWay: "bg-primary/15 text-primary",
  delivered: "bg-success/15 text-success",
  rejected: "bg-destructive/15 text-destructive",
  canceled: "bg-muted-foreground/15 text-muted-foreground",
};
const ORDER_BAR: Record<CartOrderStatus, string> = {
  pending: "bg-brand",
  accepted: "bg-primary",
  onTheWay: "bg-primary/70",
  delivered: "bg-success",
  rejected: "bg-destructive",
  canceled: "bg-muted-foreground/50",
};

export function orderStatusMeta(status: CartOrderStatus, t: T): StatusMeta {
  return {
    label: t(`orderStatus.${status}`),
    tone: ORDER_TONE[status],
    barTone: ORDER_BAR[status],
    rank: ORDER_STATUSES.indexOf(status),
  };
}

export type ReservationStatus = "Pendente" | "Confirmada" | "Recusada" | "Cancelada";
export const RESERVATION_STATUSES: ReservationStatus[] = [
  "Pendente",
  "Confirmada",
  "Recusada",
  "Cancelada",
];

const RESV_TONE: Record<string, string> = {
  Pendente: "bg-brand/15 text-brand",
  Confirmada: "bg-success/15 text-success",
  Recusada: "bg-destructive/15 text-destructive",
  Cancelada: "bg-muted-foreground/15 text-muted-foreground",
};
const RESV_BAR: Record<string, string> = {
  Pendente: "bg-brand",
  Confirmada: "bg-success",
  Recusada: "bg-destructive",
  Cancelada: "bg-muted-foreground/50",
};
const RESV_KEY: Record<string, string> = {
  Pendente: "pending",
  Confirmada: "confirmed",
  Recusada: "rejected",
  Cancelada: "canceled",
};

export function reservationStatusMeta(status: string, t: T): StatusMeta {
  return {
    label: RESV_KEY[status] ? t(`reservationStatus.${RESV_KEY[status]}`) : status,
    tone: RESV_TONE[status] ?? "bg-surface text-muted-foreground",
    barTone: RESV_BAR[status] ?? "bg-muted-foreground/50",
    rank: RESERVATION_STATUSES.indexOf(status as ReservationStatus),
  };
}
