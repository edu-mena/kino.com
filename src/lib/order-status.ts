import type { CartOrder } from "@/lib/cart";
import type { useTranslation } from "@/i18n";

/** O estado fica guardado como código, nunca já traduzido — assim trocar
 * de idioma atualiza pedidos já existentes. Partilhado entre `/entrega`
 * (histórico do cliente) e o assistente de partilha (`pending-share-dialog`
 * — mostra o estado ao lado de cada pedido na lista de escolha). */
export function orderStatusLabel(
  status: CartOrder["status"],
  t: ReturnType<typeof useTranslation>["t"],
) {
  const key = {
    pending: "statusPending",
    accepted: "statusAccepted",
    onTheWay: "statusOnTheWay",
    ready: "statusReady",
    delivered: "statusDelivered",
    completed: "statusCompleted",
    rejected: "statusRejected",
    canceled: "statusCanceled",
  }[status];
  return t(`entrega.${key}`);
}
