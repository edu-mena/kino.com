import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
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
  });

  return router;
};
