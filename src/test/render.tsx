import type { ReactElement, ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";

import { PreferencesProvider } from "@/lib/preferences";

/**
 * `render` da Testing Library com os providers que quase todo o componente
 * da app espera (i18n resolve o idioma a partir de `usePreferences`).
 */
function Providers({ children }: { children: ReactNode }) {
  return <PreferencesProvider>{children}</PreferencesProvider>;
}

export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return render(ui, { wrapper: Providers, ...options });
}

export * from "@testing-library/react";
