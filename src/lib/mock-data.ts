/**
 * Dados mockados sem equivalente de domínio (restaurante/prato) no dataset
 * novo (`src/data/mockData.ts`). Restaurantes, pratos, ofertas e endereços
 * migraram todos para lá — isto fica só com o que é puramente de UI/conta.
 */

export const paymentMethods = [
  { id: "visa", label: "Visa Card", detail: "•••• 4242", brand: "VISA" },
  { id: "master", label: "Mastercard", detail: "•••• 5656", brand: "MC" },
  { id: "mpesa", label: "M-Pesa", detail: "•••• 123456", brand: "M-PESA" },
  { id: "unitel", label: "Unitel Money", detail: "•••• 789012", brand: "UNITEL" },
  { id: "bai", label: "Banco BAI Directo", detail: "•••• 3456", brand: "BAI" },
  { id: "cash", label: "Dinheiro na entrega", detail: "Pague quando o pedido chegar", brand: "CASH" },
];

export const trackingSteps = [
  { id: 1, title: "Pedido feito", detail: "O seu pedido foi recebido", time: "12:45", done: true },
  { id: 2, title: "Em preparação", detail: "A cozinha está a preparar", time: "12:50", done: true },
  { id: 3, title: "A caminho", detail: "O estafeta saiu para entrega", time: "13:10", done: true },
  { id: 4, title: "A chegar", detail: "Chega em poucos minutos", time: "—", done: false },
  { id: 5, title: "Entregue", detail: "Bom apetite!", time: "—", done: false },
];

export const helpTopics = [
  "Como fazer um pedido",
  "Métodos de pagamento",
  "Tempo de entrega",
  "Acompanhar o meu pedido",
  "Cancelar o meu pedido",
  "Reembolsos e devoluções",
];
