import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { RouteErrorBoundary } from "./components/route-error";
import { RouteNotFound } from "./components/route-not-found";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Pré-carrega o código (e loaders) da rota assim que o utilizador
    // passa o rato / foca um link — a navegação seguinte fica instantânea.
    defaultPreload: "intent",
    // Deixa o resultado do preload em cache 30s, para não voltar a buscar
    // tudo de novo se o utilizador só passou o rato de raspão.
    defaultPreloadStaleTime: 30_000,
    // Toda a rota herda uma fronteira de erro e um 404 coerentes — sem isto,
    // uma exceção numa rota filha rebentava até ao boundary da raiz (app
    // inteira em branco).
    defaultErrorComponent: RouteErrorBoundary,
    defaultNotFoundComponent: RouteNotFound,
  });

  return router;
};
