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

/**
 * A Kino.com é só a ponte entre cliente e restaurante — não processa
 * pagamentos, não entrega, não gere reservas nem cancelamentos. Por isso a
 * resposta de quase todos os temas remete pro restaurante em concreto.
 */
export const helpArticles = [
  {
    question: "Como fazer um pedido?",
    answer:
      "Cada restaurante tem regras próprias sobre pedidos take away, agendamento de pratos e reserva de mesas. Essas regras ficam visíveis na página do restaurante escolhido, antes de finalizar o pedido.",
  },
  {
    question: "Como fazer pagamentos?",
    answer:
      "A Kino.com não recebe pagamentos diretamente dos clientes — apenas facilita a ligação entre clientes e restaurantes. O pagamento é combinado diretamente com o restaurante escolhido.",
  },
  {
    question: "Qual o tempo de entrega?",
    answer:
      "O tempo de entrega é definido e gerido pelo próprio restaurante, com base na sua localização e disponibilidade no momento do pedido.",
  },
  {
    question: "Como acompanho o meu pedido?",
    answer: "O acompanhamento do pedido é feito diretamente com o restaurante escolhido.",
  },
  {
    question: "Como cancelar o meu pedido?",
    answer:
      "O cancelamento segue as regras indicadas pelo restaurante — entre em contacto diretamente com ele assim que possível.",
  },
  {
    question: "Como funcionam reembolsos e devoluções?",
    answer:
      "Reembolsos e devoluções são tratados diretamente com o restaurante, da mesma forma que cancelamentos.",
  },
  {
    question: "Como funciona a Kino.com?",
    answer:
      "A Kino.com é uma plataforma que liga clientes e restaurantes de Luanda — não processa pagamentos nem faz entregas. O papel da Kino é ajudar a descobrir restaurantes, ver cardápios e iniciar o contacto; tudo o resto (pagamento, preparo, entrega, reserva) é combinado diretamente com o restaurante.",
  },
  {
    question: "Como reservar uma mesa?",
    answer:
      "Pode pedir uma reserva a partir da página de Reservas ou do perfil do restaurante. A confirmação final, eventual caução e as regras da mesa ficam a cargo do restaurante escolhido.",
  },
  {
    question: "Algo no meu pedido chegou errado ou em falta",
    answer:
      "Fale diretamente com o restaurante através do contacto disponível na página do pedido ou do restaurante — é ele quem prepara e entrega, por isso resolve esse tipo de situação.",
  },
  {
    question: "Como altero as minhas preferências alimentares?",
    answer:
      "Em Preferências pode escolher ingredientes favoritos e ingredientes que não podem constar no prato — avisamos automaticamente o restaurante sempre que fizer um pedido.",
  },
];
