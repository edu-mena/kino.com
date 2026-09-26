export const formatKz = (value: number) =>
  `AOA ${value.toLocaleString("pt-AO", { maximumFractionDigits: 0 })}`;

/** Contagem simples com separador de milhares (ex: stats de /sobre — nº de
 * clientes/restaurantes/pratos, calculados a partir dos dados reais). */
export const formatCount = (value: number) =>
  value.toLocaleString("pt-AO", { maximumFractionDigits: 0 });
