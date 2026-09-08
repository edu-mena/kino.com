import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * `/checkout` era o passo em que o cliente escolhia o pagamento. Com os
 * modos de pedido (entrega / take away / no local), o pedido sai completo
 * do card e o restaurante é que fixa o método de pagamento exigido ao
 * aceitar — não há mais passo de checkout. A rota mantém-se só para
 * redirecionar quem tenha um link antigo.
 */
export const Route = createFileRoute("/checkout")({
  beforeLoad: () => {
    throw redirect({ to: "/entrega" });
  },
});
