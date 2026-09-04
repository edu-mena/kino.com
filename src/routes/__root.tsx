import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import iconImage from "../assets/icon.png";
import { AddressesProvider } from "../lib/addresses";
import { BillProvider } from "../lib/bill";
import { CartProvider } from "../lib/cart";
import { LocationProvider } from "../lib/location";
import { AuthProvider } from "../lib/auth";
import { MenuAdminProvider } from "../lib/menu-admin";
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
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      // O site só tem tema light. Sem isto, alguns telemóveis (dark mode
      // forçado do Android/browser) tentam "escurecer" a página sozinhos e
      // acabam por quebrar contraste em pontos com cor fixa.
      { name: "color-scheme", content: "light" },
      { title: "Kino.com — Comida entregue em minutos" },
      {
        name: "description",
        content:
          "Peça dos melhores restaurantes de Luanda e receba em minutos. Burgers, pizza, pratos e bebidas no Kino.com.",
      },
      { name: "author", content: "Kino.com" },
      { property: "og:title", content: "Kino.com — Comida entregue em minutos" },
      {
        property: "og:description",
        content: "Peça dos melhores restaurantes de Luanda e receba em minutos.",
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

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
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
                          <TablesProvider>
                            <NotificationsProvider>
                              <TutorialProvider>
                                {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
                                <Outlet />
                                <Toaster />
                              </TutorialProvider>
                            </NotificationsProvider>
                          </TablesProvider>
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
