import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Standalone config, deliberately NOT reusing vite.config.ts — that one is
// wrapped by @lovable.dev/vite-tanstack-config, which pulls in the
// TanStack Start SSR/Nitro plugins. Those have no place in a unit-test
// run (no server to build), so tests get their own minimal setup: just
// the "@/*" alias tests actually need to import app code.
export default defineConfig({
  test: {
    // Every test so far is pure logic (no DOM), so "node" keeps runs fast.
    // A future component test can opt into jsdom per-file with a
    // `// @vitest-environment jsdom` comment at the top of that file.
    environment: "node",
    globals: true,
    include: ["src/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
