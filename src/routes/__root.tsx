import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

// Só faz algo com VITE_SHARED_MOCK_URL definida (ambiente de teste local
// partilhado, ver mock-server/README.md) — vazio em qualquer outro
// caso (dev normal, Vercel, produção real), incluindo em SSR.
import "../lib/shared-mock-sync";
import appCss from "../styles.css?url";
import iconImage from "../assets/icon.png";
import { AppSkeleton } from "../components/app-skeleton";
import { PendingShareDialog } from "../components/pending-share-dialog";
import { AddressesProvider } from "../lib/addresses";
import { BillProvider } from "../lib/bill";
import { CartProvider } from "../lib/cart";
import { LocationProvider } from "../lib/location";
import { AuthProvider, useAuth } from "../lib/auth";
import { MenuAdminProvider } from "../lib/menu-admin";
import { PendingShareProvider } from "../lib/pending-share";
import { PreferencesProvider } from "../lib/preferences";
import { ReservationsProvider } from "../lib/reservations";
import { StoriesProvider } from "../lib/stories";
import { SubscriptionsProvider } from "../lib/subscriptions";
import { NotificationsProvider } from "../lib/notifications";
import { TablesProvider } from "../lib/tables";
import { TutorialProvider } from "../lib/tutorial";
import { Toaster } from "../components/ui/sonner";
import { RouteErrorBoundary } from "../components/route-error";
import { RouteNotFound } from "../components/route-not-found";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      // `viewport-fit=cover` é o que liga env(safe-area-inset-*) em CSS —
      // sem isto, os valores ficam sempre 0 e conteúdo fixo (tabbar,
      // sheets/drawers) pode ficar por baixo do entalhe/Dynamic Island ou
      // da barra de gestos do iPhone (ver styles.css e site-shell.tsx).
      // Inofensivo em Android/desktop, onde não há safe-area nenhuma.
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      // O site só tem tema light. Sem isto, alguns telemóveis (dark mode
      // forçado do Android/browser) tentam "escurecer" a página sozinhos e
      // acabam por quebrar contraste em pontos com cor fixa.
      { name: "color-scheme", content: "light" },
      { title: "Luku.com — Os melhores restaurantes de Angola" },
      {
        name: "description",
        content:
          "Descubra os melhores restaurantes de Angola, veja o menu completo e reserve a sua mesa. Tudo no Luku.com.",
      },
      { name: "author", content: "Luku.com" },
      { property: "og:title", content: "Luku.com — Os melhores restaurantes de Angola" },
      {
        property: "og:description",
        content: "Descubra onde jantar em Angola, veja o menu e reserve a sua mesa.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: iconImage },
      { property: "og:image:width", content: "200" },
      { property: "og:image:height", content: "200" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: iconImage },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=DM+Sans:wght@400;500;700&display=swap",
      },
      { rel: "icon", href: iconImage, type: "image/png" },
      { rel: "apple-touch-icon", href: iconImage },
      { rel: "shortcut icon", href: iconImage },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: RouteNotFound,
  errorComponent: RouteErrorBoundary,
});

/** Segura *toda* a árvore de rotas até `AuthProvider` saber se há sessão
 * guardada — sem isto, cada página teria de repetir a mesma checagem para
 * evitar o "flash" de conteúdo de convidado/logado trocado (era o bug: só a
 * home e o cardápio público tinham isto, o resto das páginas não). */
function AuthGate({ children }: { children: ReactNode }) {
  const { isLoading } = useAuth();
  if (isLoading) return <AppSkeleton />;
  return <>{children}</>;
}

function RootShell({ children }: { children: ReactNode }) {
  return (
    // `pt` é o idioma por omissão (mercado de Luanda). `useTranslation`
    // atualiza `<html lang>` no cliente se o utilizador trocar para en/fr.
    // Um `lang` errado faz alguns browsers autotraduzir a página.
    <html lang="pt">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    // Na app nativa (Android/iOS), o WebView por definição desenha por
    // baixo da barra de estado/notificações (edge-to-edge) — sem isto o
    // conteúdo fica escondido atrás do relógio/ícones do telemóvel.
    // `overlay: false` faz o Capacitor dar padding ao WebView em vez de o
    // deixar desenhar por baixo. Import dinâmico: no-op inofensivo na web.
    import("@capacitor/core").then(({ Capacitor }) => {
      if (!Capacitor.isNativePlatform()) return;
      import("@capacitor/status-bar").then(({ StatusBar }) => {
        StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
      });
    });
  }, []);

  useEffect(() => {
    // Web Push só existe no browser — a app nativa (Android/iOS) não usa
    // este caminho (ver capacitor/README.md), por isso nem regista o
    // service worker aí. Import dinâmico só para o check de plataforma;
    // `registerPushServiceWorker` já é no-op sozinho sem suporte.
    import("@capacitor/core").then(({ Capacitor }) => {
      if (Capacitor.isNativePlatform()) return;
      import("../lib/push-notifications").then(({ registerPushServiceWorker }) => {
        registerPushServiceWorker();
      });
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SubscriptionsProvider>
          <PreferencesProvider>
            <StoriesProvider>
              <AddressesProvider>
                <LocationProvider>
                  <ReservationsProvider>
                    <BillProvider>
                      <MenuAdminProvider>
                        <CartProvider>
                          <PendingShareProvider>
                            <TablesProvider>
                              <NotificationsProvider>
                                <TutorialProvider>
                                  <AuthGate>
                                    {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
                                    <Outlet />
                                  </AuthGate>
                                  <PendingShareDialog />
                                  <Toaster />
                                </TutorialProvider>
                              </NotificationsProvider>
                            </TablesProvider>
                          </PendingShareProvider>
                        </CartProvider>
                      </MenuAdminProvider>
                    </BillProvider>
                  </ReservationsProvider>
                </LocationProvider>
              </AddressesProvider>
            </StoriesProvider>
          </PreferencesProvider>
        </SubscriptionsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
