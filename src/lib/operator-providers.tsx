import type { ReactNode } from "react";

import { CouriersProvider } from "./couriers";
import { OffersAdminProvider } from "./offers-admin";
import { PartnerAppsProvider } from "./partner-apps";
import { RestaurantAdminProvider } from "./restaurant-admin";
import { StoriesAdminProvider } from "./stories-admin";
import { SystemAdminProvider } from "./system-admin";

/**
 * Estado que só os painéis de operador (`/admin/*` e `/sistema/*`, mais os
 * escape hatches `/admin/entrar`, `/sistema/entrar`, `/admin/cardapio-pdf`)
 * precisam. Antes vivia no `__root`, o que obrigava a home de convidado e
 * todas as páginas de cliente a montar — e a incluir no bundle inicial —
 * sete contextos que nunca usam. Agora fica aqui, montado só nesses ramos,
 * e o código destes providers passa a code-split para os chunks de `/admin`
 * e `/sistema`.
 *
 * A ordem NÃO é indiferente: `OffersAdminProvider` chama `useSystemAdmin()`
 * E `useRestaurantAdmin()` no próprio corpo (não num filho) — um provider
 * ancestral nunca consegue ler o contexto de um descendente, por isso
 * `RestaurantAdminProvider` e `SystemAdminProvider` têm de envolver
 * `OffersAdminProvider` por fora, nunca por dentro (bug real, encontrado
 * porque `/sistema/entrar` rebentava com "useSystemAdmin must be used
 * inside SystemAdminProvider" — SystemAdminProvider estava mais para
 * dentro do que OffersAdminProvider). `PartnerAppsProvider` (só
 * useSystemAdmin) e `CouriersProvider` (só useRestaurantAdmin) continuam
 * bem onde estão, cada um já dentro do respetivo provider.
 */
export function OperatorProviders({ children }: { children: ReactNode }) {
  return (
    <RestaurantAdminProvider>
      <SystemAdminProvider>
        <StoriesAdminProvider>
          <OffersAdminProvider>
            <CouriersProvider>
              <PartnerAppsProvider>{children}</PartnerAppsProvider>
            </CouriersProvider>
          </OffersAdminProvider>
        </StoriesAdminProvider>
      </SystemAdminProvider>
    </RestaurantAdminProvider>
  );
}
