import { useEffect, useState } from "react";
import {
  DEFAULT_DELIVERY_POLICY,
  getDeliveryPolicy,
  type DeliveryPolicy,
} from "@/data/platform-settings-store";

/**
 * Política de entrega global, reativa às mudanças feitas em
 * `/sistema/operação` — mesmo padrão SSR-safe de `@/data/use-offers`:
 * primeira renderização usa o valor por omissão, sincroniza com o estado
 * real logo a seguir, só no cliente.
 */
export function useDeliveryPolicy(): DeliveryPolicy {
  const [policy, setPolicy] = useState<DeliveryPolicy>(DEFAULT_DELIVERY_POLICY);

  useEffect(() => {
    const sync = () => setPolicy(getDeliveryPolicy());
    sync();
    window.addEventListener("luku:menu-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("luku:menu-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return policy;
}
