import type { ReactElement, ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";

import { AuthProvider } from "@/lib/auth";
import { PreferencesProvider } from "@/lib/preferences";

/**
 * `render` da Testing Library com os providers que quase todo o componente
 * da app espera (i18n resolve o idioma a partir de `usePreferences`).
 * `AuthProvider` tem de vir por fora — `PreferencesProvider` agora lê
 * `useAuth()` (para sincronizar `dietaryRestrictions` com o backend real),
 * e só funciona como descendente dele, nunca como ancestral (mesma classe de
 * bug já vista em @/lib/restaurant-admin).
 */
function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <PreferencesProvider>{children}</PreferencesProvider>
    </AuthProvider>
  );
}

export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return render(ui, { wrapper: Providers, ...options });
}

export * from "@testing-library/react";
