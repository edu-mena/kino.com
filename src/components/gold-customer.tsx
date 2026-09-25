import { Link } from "@tanstack/react-router";
import { Crown, MessageCircle, UserRound } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useRestaurants } from "@/data/use-restaurants-query";
import { useTranslation } from "@/i18n";
import { formatKz } from "@/lib/format";
import { GOLD_MIN_SPEND, GOLD_MIN_VISITS, progressToGold, type LoyaltyStats } from "@/lib/loyalty";
import { useOwnLoyalty } from "@/lib/use-loyalty";

/** Selo "Gold" — estático (dentro de linhas que já são botões). */
export function GoldBadge({ size = "sm" }: { size?: "sm" | "md" }) {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full bg-star/20 font-bold text-foreground ${
        size === "md" ? "px-3 py-1 text-xs" : "px-1.5 py-0.5 text-[10px]"
      }`}
    >
      <Crown className={`fill-star text-star ${size === "md" ? "h-3.5 w-3.5" : "h-3 w-3"}`} />
      {t("loyalty.gold")}
    </span>
  );
}

/** Selo clicável: abre a ficha rápida do cliente Gold (cumpridos, total
 * gasto) com atalhos para a ficha completa e o WhatsApp. */
export function GoldCustomerPopover({
  stats,
  name,
  phone,
  customerKey,
}: {
  stats: LoyaltyStats;
  name: string;
  phone?: string | undefined;
  customerKey: string;
}) {
  const { t } = useTranslation();
  const digits = phone?.replace(/\D/g, "") ?? "";
  const wa = digits ? `https://wa.me/${digits.startsWith("244") ? digits : `244${digits}`}` : null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t("loyalty.openCardAria", { name })}
          className="rounded-full transition-transform hover:scale-105"
        >
          <GoldBadge size="md" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 rounded-xl border border-star/40 bg-card p-4 text-sm text-foreground">
        <p className="flex items-center gap-1.5 font-display text-base font-bold">
          <Crown className="h-4 w-4 fill-star text-star" />
          {t("loyalty.cardTitle")}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{name}</p>
        <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3">
          <div>
            <dt className="text-[11px] text-muted-foreground">{t("loyalty.honored")}</dt>
            <dd className="font-display text-lg font-extrabold">{stats.honoredCount}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted-foreground">{t("loyalty.spend")}</dt>
            <dd className="font-display text-lg font-extrabold">{formatKz(stats.spend)}</dd>
          </div>
        </dl>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {t("loyalty.rule", { visits: GOLD_MIN_VISITS - 1, spend: formatKz(GOLD_MIN_SPEND) })}
        </p>
        <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
          <Link
            to="/admin/clientes"
            search={{ cliente: customerKey }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/5"
          >
            <UserRound className="h-3.5 w-3.5" />
            {t("loyalty.openProfile")}
          </Link>
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary hover:text-primary"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </a>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Lado do cliente: "É cliente Gold" ou quanto falta (basta uma meta). */
export function OwnGoldStatus({
  stats,
  restaurantName,
}: {
  stats: LoyaltyStats | undefined;
  restaurantName: string;
}) {
  const { t } = useTranslation();
  if (!stats || (stats.honoredCount === 0 && stats.spend === 0)) return null;

  if (stats.tier === "gold") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-star/50 bg-star/10 px-4 py-3">
        <Crown className="h-5 w-5 shrink-0 fill-star text-star" />
        <p className="text-sm font-semibold text-foreground">
          {t("loyalty.youAreGold", { name: restaurantName })}
        </p>
      </div>
    );
  }

  const p = progressToGold(stats);
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <Crown className="h-4 w-4 text-star" />
        {t("loyalty.progressTitle")}
      </p>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(p.ratio * 100)}
      >
        <div className="h-full rounded-full bg-star" style={{ width: `${p.ratio * 100}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        {t("loyalty.progressHint", {
          visits: p.remainingVisits,
          spend: formatKz(p.remainingSpend),
        })}
      </p>
    </div>
  );
}

/** Perfil do cliente: restaurantes onde já é Gold. Nada, se nenhum. */
export function OwnGoldRestaurants() {
  const { t } = useTranslation();
  const loyalty = useOwnLoyalty();
  const { data: restaurants = [] } = useRestaurants();
  const gold = restaurants.filter((r) => loyalty.get(r.id)?.tier === "gold");
  if (gold.length === 0) return null;

  return (
    <section className="card-soft mt-6 border-star/50 p-6">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold text-primary">
        <Crown className="h-5 w-5 fill-star text-star" />
        {t("loyalty.profileTitle")}
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">{t("loyalty.profileHint")}</p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {gold.map((r) => (
          <li key={r.id}>
            <Link
              to="/restaurantes/$id"
              params={{ id: r.id }}
              className="inline-flex items-center gap-1.5 rounded-full bg-star/15 px-3 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-star/25"
            >
              <Crown className="h-3.5 w-3.5 fill-star text-star" />
              {r.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
