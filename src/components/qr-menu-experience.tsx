import { Link, useNavigate } from "@tanstack/react-router";
import {
  BellRing,
  CalendarCheck,
  ChevronRight,
  Clock,
  Compass,
  Loader2,
  MapPin,
  Printer,
  ShoppingBag,
  Sparkles,
  Star,
  Utensils,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { MenuBrowser } from "@/components/menu-browser";
import { OrderBuilderCard } from "@/components/order-builder-card";
import { getRestaurantFulfillmentModes } from "@/data/helpers";
import { useRestaurantDetail, useRestaurantMenuItems } from "@/data/use-restaurants-query";
import { useTranslation } from "@/i18n";
import { useAuth } from "@/lib/auth";
import { billLineUnitPrice, useBill } from "@/lib/bill";
import { formatKz } from "@/lib/format";
import { setPostLoginRedirect } from "@/lib/post-login-redirect";
import { useRestaurantStatus } from "@/lib/restaurant-status";
import { cn } from "@/lib/utils";

/** O que a página já sabe antes do restaurante completo chegar da API
 * (vem do `GET /qr/{code}`, um só pedido) — dá para pintar o topo logo. */
export type QrRestaurantPreview = {
  id: string;
  name: string;
  cuisine?: string | undefined;
  coverImage?: string | undefined;
  logo?: string | undefined;
  rating?: number | undefined;
};

export type QrTableInfo = {
  id: string;
  name: string;
  area?: string | undefined;
  combinedWith: string[];
};

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join("") || "R"
  );
}

/** "Mesa 12" → "12" para o círculo grande; "Varanda" → "V". */
function tableBadge(name: string): string {
  return name.match(/(\d+[A-Za-z]?)\s*$/)?.[1] ?? name.trim().slice(0, 2).toUpperCase();
}

/**
 * Cardápio aberto pelo QR — a porta de entrada da Luku para quem está
 * sentado no restaurante e ainda não a conhece. Telemóvel primeiro: topo
 * do restaurante, "Está na Mesa 5", cardápio com "+" em cada prato, pedido
 * direto da mesa (o cartão do pedido já começa em "No local" com a mesa —
 * ver `@/lib/table-session`) e, no fim, o que mais a Luku faz.
 *
 * Ver o cardápio nunca exige conta; só enviar o pedido. "Entrar com Google"
 * acontece aqui mesmo (popup) — o cliente não perde a mesa nem o que já
 * escolheu.
 */
export function QrMenuExperience({
  restaurantId,
  preview,
  table,
  printHref,
}: {
  restaurantId: string;
  preview?: QrRestaurantPreview | undefined;
  table?: QrTableInfo | null | undefined;
  /** Versão A4 para imprimir (só no cardápio por link, `/menu/$id`). */
  printHref?: { to: "/menu/$restaurantId"; params: { restaurantId: string } } | undefined;
}) {
  const { t } = useTranslation();
  const { isLoggedIn, isLoading: authLoading, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { data: restaurant } = useRestaurantDetail(restaurantId);
  const status = useRestaurantStatus(restaurantId);
  const [loggingIn, setLoggingIn] = useState(false);

  const name = restaurant?.name ?? preview?.name ?? "";
  const cover = restaurant?.coverImage ?? preview?.coverImage;
  const restaurantLogo = restaurant?.logo || preview?.logo;
  const cuisine = restaurant?.cuisine || preview?.cuisine;
  const rating = restaurant?.rating ?? preview?.rating;
  const modes = restaurant ? getRestaurantFulfillmentModes(restaurant) : [];
  const ordersAtTable = modes.includes("dinein");
  const canOrder = modes.length > 0 && status.available;
  const tableLabel = table ? [table.name, ...table.combinedWith].join(" + ") : null;

  useEffect(() => {
    if (name) document.title = `${name} — ${t("qrMenu.titleSuffix")}`;
  }, [name, t]);

  const goLogin = async () => {
    setLoggingIn(true);
    try {
      await loginWithGoogle();
      toast.success(t("qrMenu.loggedInToast"));
    } catch (error) {
      const dismissed =
        (error instanceof Error && error.message === "google_auth_dismissed") ||
        (error as { code?: string } | null)?.code === "SIGN_IN_CANCELED";
      if (!dismissed) toast.error(t("entrar.errorToast"));
    } finally {
      setLoggingIn(false);
    }
  };

  const otherLoginOptions = () => {
    setPostLoginRedirect(window.location.pathname + window.location.search);
    void navigate({ to: "/entrar" });
  };

  return (
    <div className="min-h-screen bg-background pb-36">
      {/* Barra do topo */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
          <Link to={isLoggedIn ? "/" : "/luku"} className="flex items-center gap-2">
            <img src={logo} alt="Luku" className="h-8 w-auto" />
          </Link>
          {!authLoading &&
            (isLoggedIn ? (
              <Link
                to="/pedidos"
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary"
              >
                <ShoppingBag className="h-3.5 w-3.5" /> {t("qrMenu.myOrders")}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => void goLogin()}
                disabled={loggingIn}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {loggingIn && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {t("qrMenu.signIn")}
              </button>
            ))}
        </div>
      </header>

      <main className="mx-auto max-w-3xl">
        {/* Topo do restaurante */}
        <section className="relative">
          <div className="relative h-52 overflow-hidden sm:mx-4 sm:mt-4 sm:h-64 sm:rounded-[2rem]">
            {cover ? (
              <img src={cover} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-primary to-primary/70" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-5">
              <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white shadow-lg ring-2 ring-white/70">
                {restaurantLogo ? (
                  <img src={restaurantLogo} alt="" className="h-full w-full object-contain p-1.5" />
                ) : (
                  <span className="font-display text-xl font-extrabold text-primary">
                    {initials(name)}
                  </span>
                )}
              </span>
              <div className="min-w-0 pb-0.5 text-white">
                <h1 className="truncate font-display text-2xl font-extrabold leading-tight drop-shadow sm:text-3xl">
                  {name || " "}
                </h1>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-white/85">
                  {cuisine && <span>{cuisine}</span>}
                  {rating != null && rating > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-star text-star" />
                      {rating.toFixed(1)}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* "Está na Mesa 5" */}
          <div className="relative z-10 mx-4 -mt-5 sm:mx-8">
            <div className="card-soft flex items-center gap-4 p-4 shadow-lg">
              {table ? (
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand font-display text-xl font-extrabold text-brand-foreground shadow-md">
                  {tableBadge(table.name)}
                </span>
              ) : (
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                  <Utensils className="h-6 w-6" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-widest text-brand">
                  {table ? t("qrMenu.youAreAt") : t("qrMenu.welcome")}
                </p>
                <p className="truncate font-display text-lg font-extrabold text-foreground">
                  {tableLabel ?? t("qrMenu.digitalMenu")}
                  {table?.area ? (
                    <span className="font-sans text-sm font-medium text-muted-foreground">
                      {" "}
                      · {table.area}
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  {!restaurant
                    ? t("common.loading")
                    : !status.available
                      ? status.reason === "closed" && status.opensAt
                        ? t("qrMenu.closedUntil", { time: status.opensAt })
                        : t("qrMenu.notTakingOrders")
                      : table && ordersAtTable
                        ? t("qrMenu.orderFromTableHint")
                        : canOrder
                          ? t("qrMenu.orderHint")
                          : t("qrMenu.browseOnlyHint")}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Como funciona — só para quem ainda não tem conta */}
        {!isLoggedIn && canOrder && (
          <section className="mx-4 mt-5 grid grid-cols-3 gap-2 sm:mx-8">
            <Step n={1} icon={Utensils} text={t("qrMenu.step1")} />
            <Step
              n={2}
              icon={BellRing}
              text={table && ordersAtTable ? t("qrMenu.step2Table") : t("qrMenu.step2")}
            />
            <Step n={3} icon={Clock} text={t("qrMenu.step3")} />
          </section>
        )}

        {/* Cardápio */}
        <section className="mt-6 px-4 sm:px-8">
          <h2 className="mb-3 font-display text-xl font-extrabold text-foreground">
            {t("qrMenu.menuTitle")}
          </h2>
          <MenuBrowser lockedRestaurantId={restaurantId} />
        </section>

        {/* A Luku, para quem a está a conhecer agora */}
        {!isLoggedIn ? (
          <section className="mx-4 mt-10 overflow-hidden rounded-[2rem] bg-primary text-primary-foreground sm:mx-8">
            <div className="p-6 sm:p-8">
              <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-widest">
                <Sparkles className="h-3.5 w-3.5" /> {t("qrMenu.lukuEyebrow")}
              </p>
              <h2 className="mt-3 font-display text-2xl font-extrabold leading-tight sm:text-3xl">
                {t("qrMenu.lukuTitle")}
              </h2>
              <p className="mt-2 text-sm text-primary-foreground/80">{t("qrMenu.lukuText")}</p>
              <ul className="mt-5 space-y-3">
                <Perk icon={Compass} text={t("qrMenu.perkDiscover")} />
                <Perk icon={CalendarCheck} text={t("qrMenu.perkReserve")} />
                <Perk icon={ShoppingBag} text={t("qrMenu.perkOrder")} />
                <Perk icon={Star} text={t("qrMenu.perkLoyalty")} />
              </ul>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => void goLogin()}
                  disabled={loggingIn}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-bold text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {loggingIn && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t("qrMenu.createAccount")}
                </button>
                <Link
                  to="/luku"
                  className="inline-flex items-center justify-center gap-1 rounded-full border border-white/30 px-5 py-3 text-sm font-bold transition-colors hover:bg-white/10"
                >
                  {t("qrMenu.discoverLuku")} <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>
        ) : (
          <section className="mx-4 mt-10 grid gap-2 sm:mx-8 sm:grid-cols-2">
            <Link
              to="/restaurantes/$id"
              params={{ id: restaurantId }}
              className="card-soft flex items-center gap-3 p-4 transition-colors hover:border-primary"
            >
              <MapPin className="h-5 w-5 text-brand" />
              <span className="min-w-0 flex-1 text-sm font-semibold text-foreground">
                {t("qrMenu.restaurantPage")}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link
              to="/restaurantes"
              className="card-soft flex items-center gap-3 p-4 transition-colors hover:border-primary"
            >
              <Compass className="h-5 w-5 text-brand" />
              <span className="min-w-0 flex-1 text-sm font-semibold text-foreground">
                {t("qrMenu.moreRestaurants")}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </section>
        )}

        <footer className="mt-10 flex flex-col items-center gap-2 px-4 text-center text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            {t("qrMenu.poweredBy")} <img src={logo} alt="Luku" className="h-5 w-auto" />
          </span>
          {printHref && (
            <Link
              {...printHref}
              search={{ imprimir: 1 }}
              className="inline-flex items-center gap-1 underline-offset-2 hover:underline"
            >
              <Printer className="h-3.5 w-3.5" /> {t("qrMenu.printVersion")}
            </Link>
          )}
        </footer>
      </main>

      {isLoggedIn ? (
        <OrderBuilderCard />
      ) : (
        <GuestOrderBar
          restaurantId={restaurantId}
          canOrder={canOrder}
          loggingIn={loggingIn}
          onLogin={() => void goLogin()}
          onOtherOptions={otherLoginOptions}
        />
      )}
    </div>
  );
}

function Step({ n, icon: Icon, text }: { n: number; icon: typeof Utensils; text: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-surface p-3 text-center">
      <span className="relative grid h-9 w-9 place-items-center rounded-full bg-card text-primary shadow-sm">
        <Icon className="h-4 w-4" />
        <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-brand text-[9px] font-bold text-brand-foreground">
          {n}
        </span>
      </span>
      <span className="text-[11px] font-semibold leading-tight text-foreground">{text}</span>
    </div>
  );
}

function Perk({ icon: Icon, text }: { icon: typeof Utensils; text: ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-sm">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/15">
        <Icon className="h-4 w-4" />
      </span>
      <span className="pt-1.5">{text}</span>
    </li>
  );
}

/** Convidado com pratos escolhidos: total + "Entrar para pedir" (o pedido
 * precisa de conta; o que escolheu fica guardado). */
function GuestOrderBar({
  restaurantId,
  canOrder,
  loggingIn,
  onLogin,
  onOtherOptions,
}: {
  restaurantId: string;
  canOrder: boolean;
  loggingIn: boolean;
  onLogin: () => void;
  onOtherOptions: () => void;
}) {
  const { t } = useTranslation();
  const { restaurantId: billRestaurant, lines } = useBill();
  const { data: items } = useRestaurantMenuItems(restaurantId);
  const mine = billRestaurant === restaurantId ? lines : [];
  const count = mine.reduce((n, l) => n + l.qty, 0);
  const total = useMemo(
    () =>
      mine.reduce(
        (sum, l) =>
          sum +
          l.qty *
            billLineUnitPrice(
              l,
              items?.find((i) => i.id === l.menuItemId),
            ),
        0,
      ),
    [mine, items],
  );

  if (count === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-xl rounded-[1.75rem] border border-border bg-card p-3 shadow-2xl">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand/10 font-display text-base font-extrabold text-brand">
            {count}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">{t("qrMenu.yourChoice")}</p>
            <p className="font-display text-lg font-extrabold text-foreground">{formatKz(total)}</p>
          </div>
          <button
            type="button"
            onClick={onLogin}
            disabled={loggingIn || !canOrder}
            className={cn(
              "inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50",
            )}
          >
            {loggingIn && <Loader2 className="h-4 w-4 animate-spin" />}
            {canOrder ? t("qrMenu.signInToOrder") : t("qrMenu.notTakingOrdersShort")}
          </button>
        </div>
        {canOrder && (
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            {t("qrMenu.signInHint")}{" "}
            <button
              type="button"
              onClick={onOtherOptions}
              className="font-semibold text-primary underline-offset-2 hover:underline"
            >
              {t("qrMenu.otherOptions")}
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
