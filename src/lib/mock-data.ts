/**
 * Dados mockados sem equivalente de domínio (restaurante/prato) no dataset
 * novo (`src/data/mockData.ts`). Restaurantes, pratos, ofertas e endereços
 * migraram todos para lá — isto fica só com o que é puramente de UI/conta.
 */

/**
 * A Luku não processa pagamentos — o pagamento é combinado e feito
 * diretamente com o restaurante. O restaurante escolhe, ao aceitar um
 * pedido, qual destes métodos EXIGE; o cliente recebe essa exigência na
 * confirmação e paga por esse meio. Nenhum guarda dados de cartão/conta,
 * só o método.
 *
 * `digital: true` → o cliente transfere/paga pela app do método e combina o
 * comprovativo com o restaurante. `digital: false` → pago em numerário
 * presencialmente (na entrega, ao balcão ou no local).
 */
export type PaymentMethod = {
  /** Igual ao `code` de `payment_methods` no backend (ver
   * backend/database/seeders/PaymentMethodSeeder.php) — os dois catálogos
   * são estáticos e têm de bater exatamente, não há endpoint que devolva
   * os métodos reais. Já esteve dessincronizado (ids com hífen aqui,
   * `exists:payment_methods,code` a validar contra códigos com underscore
   * lá — ex: "kwik" vs "kwik_bfa", "transferencia" vs "bank_transfer"), o
   * que fazia TODA tentativa de guardar um detalhe de pagamento falhar com
   * "payment_method_code is invalid" (bug real, encontrado em produção). */
  id: string;
  label: string;
  detail: string;
  brand: string;
  digital: boolean;
};

export const paymentMethods: PaymentMethod[] = [
  {
    id: "multicaixa_express",
    label: "Multicaixa Express",
    detail: "Pagamento pela app Multicaixa Express (referência ou telefone)",
    brand: "MCX",
    digital: true,
  },
  {
    id: "kwik_bfa",
    label: "KWiK",
    detail: "Transferência instantânea KWiK (BFA)",
    brand: "KWiK",
    digital: true,
  },
  {
    id: "bai_directo",
    label: "BAI Directo",
    detail: "Transferência pela app BAI Directo",
    brand: "BAI",
    digital: true,
  },
  {
    id: "paypay_ao",
    label: "PayPay",
    detail: "Pagamento pela carteira PayPay AO",
    brand: "PayPay",
    digital: true,
  },
  {
    id: "unitel_money",
    label: "Unitel Money",
    detail: "Transferência pela carteira Unitel Money",
    brand: "UNITEL",
    digital: true,
  },
  {
    id: "bank_transfer",
    label: "Transferência bancária",
    detail: "Transferência interbancária combinada com o restaurante",
    brand: "BANCO",
    digital: true,
  },
  {
    id: "cash",
    label: "Numerário",
    detail: "Pago em dinheiro na entrega, ao balcão ou no local",
    brand: "CASH",
    digital: false,
  },
];

export function getPaymentMethod(id: string | undefined): PaymentMethod | undefined {
  return id ? paymentMethods.find((m) => m.id === id) : undefined;
}

// O FAQ da Central de Ajuda mudou-se para `@/lib/help-articles` — é texto
// puro de "casca" (sem ligação a nenhum restaurante/prato concreto), por
// isso passou a ter tradução de verdade (pt/en/fr), seguindo o mesmo
// padrão dos dicionários de `@/i18n`. Ver `src/lib/help-articles/index.ts`.
