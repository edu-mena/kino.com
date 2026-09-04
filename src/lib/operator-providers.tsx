import type { ReactNode } from "react";

import { CouriersProvider } from "./couriers";
import { MenusAdminProvider } from "./menus-admin";
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
 * Nenhum destes providers depende de outro, por isso a ordem é indiferente.
 */
export function OperatorProviders({ children }: { children: ReactNode }) {
  return (
    <RestaurantAdminProvider>
      <MenusAdminProvider>
        <StoriesAdminProvider>
          <OffersAdminProvider>
            <CouriersProvider>
              <SystemAdminProvider>
                <PartnerAppsProvider>{children}</PartnerAppsProvider>
              </SystemAdminProvider>
            </CouriersProvider>
          </OffersAdminProvider>
        </StoriesAdminProvider>
      </MenusAdminProvider>
    </RestaurantAdminProvider>
  );
}
