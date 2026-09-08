/**
 * Chave de identidade de um cliente sem backend — email, senão telefone,
 * senão nome. Usada para agrupar reservas/pedidos da mesma pessoa nos
 * painéis (Clientes, Estatísticas, Sistema). Extraída para um só sítio
 * porque estava copiada em três páginas.
 */
export function customerKey(c: {
  email?: string | undefined;
  phone?: string | undefined;
  name?: string | undefined;
}): string {
  return c.email || c.phone || c.name || "";
}

/** Chave usada quando não há sessão — o "convidado" desta janela do browser.
 * Estável de propósito: os pedidos/reservas que um convidado cria ficam
 * visíveis para ele em `/entrega` e `/reservas`, mas nunca se confundem com
 * os registos da seed (que não têm `ownerKey`) nem com os de uma conta. */
export const GUEST_KEY = "__guest__";

/** Identidade do "eu" no lado do cliente: a conta autenticada, senão o
 * convidado. É o que se carimba em `ownerKey` ao criar um pedido/reserva e
 * o que as páginas do cliente usam para mostrar só o que é da pessoa. */
export function viewerKey(
  user:
    | { email?: string | undefined; phone?: string | undefined; name?: string | undefined }
    | null
    | undefined,
): string {
  return user ? customerKey(user) : GUEST_KEY;
}
