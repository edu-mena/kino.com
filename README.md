# Kino.com

Kino.com é uma webapp de food delivery para o mercado de Luanda — descoberta de restaurantes, cardápios, favoritos, reservas e um painel administrativo para gestão de menus, ofertas e stories, tudo servido como uma aplicação full-stack renderizada no edge.

O projeto nasceu como protótipo frontend-first (mockdata, sem servidor) e foi evoluindo para uma base com SSR real, camada de dados própria e um pipeline de entrega automatizado — a estrutura que se segue reflete esse percurso, não um scaffold genérico.

## Stack

**Aplicação**

- [TanStack Start](https://tanstack.com/start) sobre React 19 — meta-framework full-stack com SSR, server functions e roteamento file-based via TanStack Router
- [TanStack Query](https://tanstack.com/query) para data-fetching e cache no cliente
- Tailwind CSS 4 + Radix UI para um design system consistente e acessível
- TypeScript estrito de ponta a ponta (rotas, camada de dados, componentes)
- i18n própria (pt/en/fr) com fallback e testes de cobertura de chaves

**Build & runtime**

- Vite 8 com Nitro como build target, empacotando o servidor para deploy no edge (Cloudflare Workers)
- Entry point de servidor customizado ([src/server.ts](src/server.ts)) que envolve o handler do TanStack Start para normalizar respostas 500 "engolidas" pelo h3 e devolver sempre uma página de erro coerente — falhas de SSR não se transformam em JSON cru para o utilizador
- Middleware CSRF explícito em [src/start.ts](src/start.ts) protegendo as server functions

## DevOps

- **CI no GitHub Actions** ([.github/workflows/ci.yml](.github/workflows/ci.yml)): pipeline `format → lint → typecheck → test → build`, correndo em cada push e PR, com `concurrency` a cancelar runs obsoletas do mesmo branch para não desperdiçar minutos de CI
- **Lighthouse CI** ([lighthouserc.json](lighthouserc.json)) num job à parte após o pipeline: acessibilidade / SEO / boas práticas como orçamento a sério (falha se `accessibility` < 0.9); performance em `warn` enquanto a medição for contra o dev server (não minificado) — detetor de regressões grosseiras até haver um alvo de preview
- **Node 22 fixado** em CI e em `engines`, alinhado ao requisito mínimo do TanStack Start — sem drift entre o que se testa e o que corre em produção
- **Deploy no edge via Cloudflare** — build gerado por Nitro, sem servidor Node tradicional a manter
- **Qualidade automatizada**: ESLint + Prettier com verificação estrita (`format:check`, não apenas `format`) e checagem de tipos isolada do build, para apanhar regressões antes do bundle
- **Testes com Vitest**, configuração isolada da configuração de build (evita puxar plugins de SSR/Nitro para um ambiente de testes que não precisa deles) e ambiente `node` por omissão; testes de componente optam por `jsdom` com `// @vitest-environment jsdom` no topo do ficheiro e usam Testing Library + `vitest-axe` (assert de acessibilidade sobre o DOM renderizado) via [src/test-setup.ts](src/test-setup.ts) / [src/test/render.tsx](src/test/render.tsx)
- Tratamento de erro pensado para produção: qualquer exceção não tratada no server entry devolve uma página de erro renderizada, nunca uma stack trace ou um JSON de erro interno

## Estrutura

```
src/
├── routes/       # Rotas file-based (públicas + área /admin)
├── components/   # Componentes de UI e de negócio
├── data/         # Stores e hooks de dados (menus, ofertas, stories, notas)
├── i18n/         # Traduções e resolução de idioma
├── lib/          # Utilitários, contexto e lógica de admin
└── server.ts     # Entry point do servidor (hardening de SSR)
```

## Desenvolvimento

Requer Node ≥ 22.12.0.

```sh
npm ci
npm run dev
```

Scripts principais:

```sh
npm run lint            # ESLint
npm run format:check    # Prettier (verificação)
npm run typecheck       # tsc --noEmit
npm test                # Vitest
npm run build           # build de produção (Vite + Nitro)
npm run optimize:assets # re-otimiza src/assets (sharp)
```

## Variáveis de ambiente

Definidas em `.env.local` (não versionado). Prefixo `VITE_` para chegarem ao cliente.

| Variável               | Valores        | Efeito                                                                                                                                                                                                            |
| ---------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_PUBLIC_BASE_URL` | URL            | Base absoluta do link no QR code do cardápio (aponta para o IP da máquina na rede local para o telemóvel ler).                                                                                                    |
| `VITE_IMAGE_CDN`       | `none`\|`wsrv` | `none` (omissão): fotos de conteúdo servidas tal como estão. `wsrv`: URLs de terceiros passam por [wsrv.nl](https://wsrv.nl) — redimensionadas ao tamanho pedido, em WebP, com `srcset`. Recomendado em produção. |
