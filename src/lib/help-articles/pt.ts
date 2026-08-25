/**
 * Português — idioma de referência do FAQ da Central de Ajuda. A forma
 * (os `id`s e a ordem) deste array é a fonte de verdade; `en.ts` e `fr.ts`
 * seguem exatamente os mesmos `id`s (ver `HelpArticle` em `./index.ts`).
 *
 * Diferente do resto do dataset mockado (`src/data/mockData.ts` — nomes de
 * restaurantes/pratos, moradas, etc., que ficam sempre em português de
 * propósito, ver `src/i18n/README.md`), o FAQ é texto puro de "casca" da
 * interface, sem ligação a nenhum restaurante/prato concreto — por isso
 * faz sentido traduzir, seguindo o mesmo padrão dos dicionários de `i18n/`.
 */
export const helpArticlesPt = [
  {
    id: "how-to-order",
    question: "Como fazer um pedido?",
    answer:
      "Cada restaurante tem regras próprias sobre pedidos take away, agendamento de pratos e reserva de mesas. Essas regras ficam visíveis na página do restaurante escolhido, antes de finalizar o pedido.",
  },
  {
    id: "how-to-pay",
    question: "Como fazer pagamentos?",
    answer:
      "A Kino.com não recebe pagamentos diretamente dos clientes — apenas facilita a ligação entre clientes e restaurantes. O pagamento é combinado diretamente com o restaurante escolhido.",
  },
  {
    id: "delivery-time",
    question: "Qual o tempo de entrega?",
    answer:
      "O tempo de entrega é definido e gerido pelo próprio restaurante, com base na sua localização e disponibilidade no momento do pedido.",
  },
  {
    id: "track-order",
    question: "Como acompanho o meu pedido?",
    answer: "O acompanhamento do pedido é feito diretamente com o restaurante escolhido.",
  },
  {
    id: "cancel-order",
    question: "Como cancelar o meu pedido?",
    answer:
      "O cancelamento segue as regras indicadas pelo restaurante — entre em contacto diretamente com ele assim que possível.",
  },
  {
    id: "refunds",
    question: "Como funcionam reembolsos e devoluções?",
    answer:
      "Reembolsos e devoluções são tratados diretamente com o restaurante, da mesma forma que cancelamentos.",
  },
  {
    id: "how-kino-works",
    question: "Como funciona a Kino.com?",
    answer:
      "A Kino.com é uma plataforma que liga clientes e restaurantes de Luanda — não processa pagamentos nem faz entregas. O papel da Kino é ajudar a descobrir restaurantes, ver cardápios e iniciar o contacto; tudo o resto (pagamento, preparo, entrega, reserva) é combinado diretamente com o restaurante.",
  },
  {
    id: "reserve-table",
    question: "Como reservar uma mesa?",
    answer:
      "Pode pedir uma reserva a partir da página de Reservas ou do perfil do restaurante. A confirmação final, eventual caução e as regras da mesa ficam a cargo do restaurante escolhido.",
  },
  {
    id: "wrong-or-missing-order",
    question: "Algo no meu pedido chegou errado ou em falta",
    answer:
      "Fale diretamente com o restaurante através do contacto disponível na página do pedido ou do restaurante — é ele quem prepara e entrega, por isso resolve esse tipo de situação.",
  },
  {
    id: "change-dietary-preferences",
    question: "Como altero as minhas preferências alimentares?",
    answer:
      "Em Preferências pode escolher ingredientes favoritos e ingredientes que não podem constar no prato — avisamos automaticamente o restaurante sempre que fizer um pedido.",
  },
];
