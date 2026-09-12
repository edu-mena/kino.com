// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // .jfif é JPEG mas não está na lista de assets do Vite por omissão.
  vite: {
    assetsInclude: ["**/*.jfif"],
    // Força o build a fazer down-level de sintaxe ES2022 (ex: class static blocks
    // usados internamente pelo radix-ui) que Safari <16.4 não consegue fazer parse —
    // causava "SyntaxError: Unexpected token '{'" e crash total no Safari.
    build: {
      target: "safari14",
    },
  },
});
