import { useEffect, useState } from "react";

/**
 * Devolve `value` só depois de `delay` ms sem mudar — usado nos campos de
 * busca (cardápio, restaurantes, clientes do admin) para não refiltrar a
 * lista a cada tecla. O campo em si continua a refletir o que a pessoa
 * escreve na hora (`value={query}`); só o filtro lê a versão com atraso.
 */
export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
