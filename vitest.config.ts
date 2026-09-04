import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Standalone config, deliberately NOT reusing vite.config.ts — that one
// pulls in the TanStack Start SSR/Nitro plugins. Those have no place in
// a unit-test run (no server to build), so tests get their own minimal
// setup: just the "@/*" alias tests actually need to import app code.
export default defineConfig({
  // Só para ficheiros de teste — o `jsx: automatic` e o Fast Refresh do
  // plugin permitem renderizar componentes com Testing Library. A config de
  // build continua a ser a do vite.config.ts (com os plugins de SSR/Nitro).
  plugins: [react()],
  test: {
    // Testes de lógica pura correm em "node" (rápido). Um teste de
    // componente opta por jsdom com `// @vitest-environment jsdom` no topo.
    environment: "node",
    globals: true,
    setupFiles: ["src/test-setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
