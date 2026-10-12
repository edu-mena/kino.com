import { createFileRoute, Link } from "@tanstack/react-router";
import { QrCode } from "lucide-react";
import { useEffect, useState } from "react";
import icon from "@/assets/icon.png";
import logo from "@/assets/logo.png";
import { QrMenuExperience } from "@/components/qr-menu-experience";
import { resolveApiQr, type ResolvedQr } from "@/data/api-qr";
import { resolveMockQr } from "@/data/tables-store";
import { getRestaurant } from "@/data/helpers";
import { useTranslation } from "@/i18n";
import { hasRealBackend } from "@/lib/api-client";
import { clearTableSession, setTableSession } from "@/lib/table-session";

/**
 * `luku.ao/q/{code}` — o que o QR impresso na mesa (ou na montra) abre.
 * Resolve o código num só pedido à API, lembra a mesa para o pedido "no
 * local" e mostra o cardápio do restaurante (`QrMenuExperience`). Um
 * código de mesa que já não existe continua a abrir o restaurante; um
 * código inválido mostra uma página simples, nunca um erro técnico.
 */
export const Route = createFileRoute("/q/$code")({
  validateSearch: (s: Record<string, unknown>): { preview?: 1 } =>
    s["preview"] === 1 || s["preview"] === "1" ? { preview: 1 } : {},
  head: () => ({
    meta: [
      { title: "Cardápio — Luku" },
      { name: "description", content: "Veja o cardápio e peça da sua mesa com a Luku." },
      { property: "og:image", content: icon },
      // Página de um QR físico: não interessa a motores de busca.
      { name: "robots", content: "noindex" },
    ],
  }),
  component: QrLanding,
});

/** Leituras contadas uma vez por sessão do browser — voltar do login ou
 * recarregar a página não conta outra leitura. */
function alreadyCounted(code: string): boolean {
  try {
    const key = `luku_qr_seen_${code}`;
    const seen = window.sessionStorage.getItem(key) === "1";
    window.sessionStorage.setItem(key, "1");
    return seen;
  } catch {
    return false;
  }
}

function resolveMock(code: string): ResolvedQr | null {
  const hit = resolveMockQr(code);
  if (!hit) return null;
  const r = getRestaurant(hit.restaurantId);
  if (!r) return null;
  return {
    code: code.toUpperCase(),
    kind: hit.table ? "table" : "restaurant",
    restaurant: {
      id: r.id,
      name: r.name,
      cuisine: r.cuisine,
      coverImage: r.coverImage,
      ...(r.logo ? { logo: r.logo } : {}),
      rating: r.rating,
    },
    table: hit.table
      ? {
          id: hit.table.id,
          name: hit.table.name,
          seats: hit.table.seats,
          ...(hit.table.area ? { area: hit.table.area } : {}),
        }
      : null,
    combinedWith: [],
  };
}

function QrLanding() {
  const { code } = Route.useParams();
  const { preview } = Route.useSearch();
  const { t } = useTranslation();
  const [state, setState] = useState<
    { status: "loading" } | { status: "ok"; qr: ResolvedQr } | { status: "invalid" }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const qr = hasRealBackend
          ? await resolveApiQr(code, preview === 1 || alreadyCounted(code))
          : resolveMock(code);
        if (cancelled) return;
        if (!qr) {
          setState({ status: "invalid" });
          return;
        }
        if (qr.table) {
          setTableSession({
            restaurantId: qr.restaurant.id,
            restaurantName: qr.restaurant.name,
            tableId: qr.table.id,
            tableName: [qr.table.name, ...qr.combinedWith].join(" + "),
            code: qr.code,
          });
        } else {
          // QR geral (porta/balcão): uma mesa lida antes já não se aplica.
          clearTableSession();
        }
        setState({ status: "ok", qr });
      } catch {
        if (!cancelled) setState({ status: "invalid" });
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [code, preview]);

  if (state.status === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background px-6 text-center">
        <img src={logo} alt="Luku" className="h-12 w-auto animate-pulse" />
        <p className="text-sm text-muted-foreground">{t("qrMenu.opening")}</p>
      </div>
    );
  }

  if (state.status === "invalid") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <img src={logo} alt="Luku" className="h-12 w-auto" />
        <span className="grid h-14 w-14 place-items-center rounded-full bg-surface text-muted-foreground">
          <QrCode className="h-6 w-6" />
        </span>
        <h1 className="font-display text-xl font-extrabold text-foreground">
          {t("qrMenu.invalidTitle")}
        </h1>
        <p className="max-w-xs text-sm text-muted-foreground">{t("qrMenu.invalidText")}</p>
        <Link
          to="/restaurantes"
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
        >
          {t("qrMenu.exploreRestaurants")}
        </Link>
      </div>
    );
  }

  const { qr } = state;
  return (
    <QrMenuExperience
      restaurantId={qr.restaurant.id}
      preview={qr.restaurant}
      table={qr.table ? { ...qr.table, combinedWith: qr.combinedWith } : null}
    />
  );
}
