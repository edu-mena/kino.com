/**
 * Setup partilhado dos testes. Corre para todos os ficheiros, por isso as
 * partes que precisam de DOM só se ativam quando o ambiente é jsdom
 * (`// @vitest-environment jsdom` no topo do ficheiro de teste).
 */
import { afterEach, expect } from "vitest";
import * as axeMatchers from "vitest-axe/matchers";

// `vitest-axe/extend-expect` vem vazio nesta versão — registamos à mão.
expect.extend(axeMatchers);

if (typeof document !== "undefined") {
  await import("@testing-library/jest-dom/vitest");
  const { cleanup } = await import("@testing-library/react");
  afterEach(() => cleanup());
}
