/**
 * Dados mockados sem equivalente de domínio (restaurante/prato) no dataset
 * novo (`src/data/mockData.ts`). Restaurantes, pratos, ofertas e endereços
 * migraram todos para lá — isto fica só com o que é puramente de UI/conta.
 */

/**
 * A Kino não processa pagamentos — isto é só a preferência que enviamos ao
 * restaurante junto do pedido; o valor é combinado e pago diretamente com
 * ele (por isso nenhum destes tem número de cartão guardado, só o método).
 */
export const paymentMethods = [
  {
    id: "cash",
    label: "Dinheiro na entrega",
    detail: "Pague ao estafeta na entrega",
    brand: "CASH",
  },
  {
    id: "pos",
    label: "Cartão (POS na entrega)",
    detail: "Multicaixa, Visa ou Mastercard",
    brand: "POS",
  },
  {
    id: "mpesa",
    label: "M-Pesa",
    detail: "Transferência combinada com o restaurante",
    brand: "M-PESA",
  },
  {
    id: "unitel",
    label: "Unitel Money",
    detail: "Transferência combinada com o restaurante",
    brand: "UNITEL",
  },
  {
    id: "transferencia",
    label: "Transferência bancária",
    detail: "Combinada diretamente com o restaurante",
    brand: "BANCO",
  },
];

// O FAQ da Central de Ajuda mudou-se para `@/lib/help-articles` — é texto
// puro de "casca" (sem ligação a nenhum restaurante/prato concreto), por
// isso passou a ter tradução de verdade (pt/en/fr), seguindo o mesmo
// padrão dos dicionários de `@/i18n`. Ver `src/lib/help-articles/index.ts`.
