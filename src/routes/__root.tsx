import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import iconImage from "../assets/icon.png";
import { AddressesProvider } from "../lib/addresses";
import { BillProvider } from "../lib/bill";
import { CartProvider } from "../lib/cart";
import { LocationProvider } from "../lib/location";
import { AuthProvider } from "../lib/auth";
import { MenuAdminProvider } from "../lib/menu-admin";
import { MenusAdminProvider } from "../lib/menus-admin";
import { OffersAdminProvider } from "../lib/offers-admin";
import { PreferencesProvider } from "../lib/preferences";
import { ReservationsProvider } from "../lib/reservations";
import { RestaurantAdminProvider } from "../lib/restaurant-admin";
import { StoriesProvider } from "../lib/stories";
import { StoriesAdminProvider } from "../lib/stories-admin";
import { TutorialProvider } from "../lib/tutorial";
import { Toaster } from "../components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

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
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
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
        <RestaurantAdminProvider>
          <PreferencesProvider>
            <StoriesProvider>
              <AddressesProvider>
                <LocationProvider>
                  <ReservationsProvider>
                    <BillProvider>
                      <MenusAdminProvider>
                        <MenuAdminProvider>
                          <StoriesAdminProvider>
                            <OffersAdminProvider>
                              <CartProvider>
                                <TutorialProvider>
                                  {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
                                  <Outlet />
                                  <Toaster />
                                </TutorialProvider>
                              </CartProvider>
                            </OffersAdminProvider>
                          </StoriesAdminProvider>
                        </MenuAdminProvider>
                      </MenusAdminProvider>
                    </BillProvider>
                  </ReservationsProvider>
                </LocationProvider>
              </AddressesProvider>
            </StoriesProvider>
          </PreferencesProvider>
        </RestaurantAdminProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
