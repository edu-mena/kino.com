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
