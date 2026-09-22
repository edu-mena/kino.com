/**
 * Modelos de política de reembolso da caução — mesmo espírito de
 * `dietary-packages.ts`/`RESTRICTION_PACKAGES` (lista curada + seleção de
 * um clique), aplicado ao card de caução em `/admin/perfil`. Ao contrário
 * dos pacotes de restrição (que ficam como tags escolhidas), aqui a
 * seleção só PREENCHE o campo de texto livre — o restaurante continua a
 * poder editar/personalizar depois de escolher um modelo.
 *
 * Texto em português, como o resto de conteúdo virado pro cliente final
 * (ver dietary-packages.ts) — não traduzido, porque é o restaurante
 * angolano a escrever a própria política, não um texto de UI da Luku.
 */
export type RefundPolicyTemplate = {
  id: string;
  label: string;
  text: string;
};

export const REFUND_POLICY_TEMPLATES: RefundPolicyTemplate[] = [
  {
    id: "full-refund",
    label: "Reembolso total (mesa ocupada)",
    text: "A caução é reembolsada na totalidade assim que a mesa é ocupada na hora combinada.",
  },
  {
    id: "deducted-from-bill",
    label: "Descontada da conta final",
    text: "A caução não é um valor extra — é descontada da conta final do pedido feito na mesa.",
  },
  {
    id: "cancellation-window",
    label: "Reembolso com aviso prévio",
    text: "Cancelamentos com pelo menos 2 horas de antecedência são reembolsados na totalidade. Sem aviso prévio, a caução não é reembolsável.",
  },
  {
    id: "partial-late-cancellation",
    label: "Reembolso parcial em cima da hora",
    text: "Cancelamentos com mais de 2 horas de antecedência são reembolsados na totalidade; com menos de 2 horas, é retido 50% da caução.",
  },
  {
    id: "no-show",
    label: "Sem reembolso em caso de não comparência",
    text: "A caução não é reembolsável em caso de não comparência (no-show) sem aviso prévio ao restaurante.",
  },
];
