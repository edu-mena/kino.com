/**
 * `vitest-axe` 0.1.0 aumenta o namespace global `Vi` (API antiga do Vitest).
 * O Vitest 4 tipa os matchers em `interface Assertion` do módulo `vitest`,
 * por isso re-declaramos o matcher aqui.
 */
import "vitest";

declare module "vitest" {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  interface Assertion<T = any> {
    toHaveNoViolations(): T;
  }
  interface AsymmetricMatchersContaining {
    toHaveNoViolations(): unknown;
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
