import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * `/entrega` passou a `/pedidos` — a página mostra todos os pedidos (entrega,
 * take away, no local), não só entregas. Fica só a reencaminhar para links
 * antigos (notificações push já enviadas, favoritos, histórico), levando o
 * `?pedido=` do deep-link de notificação junto.
 */
export const Route = createFileRoute("/entrega")({
  validateSearch: (s: Record<string, unknown>): { pedido?: string } => {
    const pedido = s["pedido"];
    return typeof pedido === "string" && pedido ? { pedido } : {};
  },
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/pedidos", search, replace: true });
  },
});
