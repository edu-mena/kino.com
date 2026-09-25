import { Link } from "@tanstack/react-router";
import { Crown, Gem, MessageCircle, UserRound } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useRestaurants } from "@/data/use-restaurants-query";
import { useTranslation } from "@/i18n";
import { formatKz } from "@/lib/format";
import {
  GOLD_MIN_SPEND,
  isPremiumTier,
  nextTier,
  PLATINUM_ABOVE_SPEND,
  type LoyaltyStats,
} from "@/lib/loyalty";
import { useOwnLoyalty } from "@/lib/use-loyalty";

type PremiumTier = "gold" | "platinum";

/** Ícone e tons de cada nível — Gold com a cor `star` (a mesma das
 * estrelas de avaliação), Platina com a cor primária. */
const TIER_STYLE: Record<
  PremiumTier,
  { Icon: typeof Crown; icon: string; pill: string; box: string; border: string }
> = {
  gold: {
    Icon: Crown,
    icon: "fill-star text-star",
    pill: "bg-star/20 text-foreground",
    box: "border-star/50 bg-star/10",
    border: "border-star/40",
  },
  platinum: {
    Icon: Gem,
    icon: "text-primary",
    pill: "bg-primary/15 text-primary",
    box: "border-primary/40 bg-primary/5",
    border: "border-primary/40",
  },
};

/** Selo "Gold"/"Platina" — estático (dentro de linhas que já são botões). */
export function LoyaltyBadge({ tier, size = "sm" }: { tier: PremiumTier; size?: "sm" | "md" }) {
  const { t } = useTranslation();
  const s = TIER_STYLE[tier];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full font-bold ${s.pill} ${
        size === "md" ? "px-3 py-1 text-xs" : "px-1.5 py-0.5 text-[10px]"
      }`}
    >
      <s.Icon className={`${s.icon} ${size === "md" ? "h-3.5 w-3.5" : "h-3 w-3"}`} />
      {t(`loyalty.${tier}`)}
    </span>
  );
}

/** Selo clicável: ficha rápida do cliente (total gasto no restaurante) com
 * atalhos para a ficha completa e o WhatsApp. Nada para clientes regulares. */
export function LoyaltyCustomerPopover({
  stats,
  name,
  phone,
  customerKey,
}: {
  stats: LoyaltyStats | undefined;
  name: string;
  phone?: string | undefined;
  customerKey: string;
}) {
  const { t } = useTranslation();
  if (!stats || !isPremiumTier(stats.tier)) return null;
  const tier = stats.tier;
  const s = TIER_STYLE[tier];
  const digits = phone?.replace(/\D/g, "") ?? "";
  const wa = digits ? `https://wa.me/${digits.startsWith("244") ? digits : `244${digits}`}` : null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t("loyalty.openCardAria", { name, tier: t(`loyalty.${tier}`) })}
          className="rounded-full transition-transform hover:scale-105"
        >
          <LoyaltyBadge tier={tier} size="md" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className={`w-72 rounded-xl border bg-card p-4 text-sm text-foreground ${s.border}`}
      >
        <p className="flex items-center gap-1.5 font-display text-base font-bold">
          <s.Icon className={`h-4 w-4 ${s.icon}`} />
          {t(`loyalty.cardTitle.${tier}`)}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{name}</p>
        <div className="mt-3 border-t border-border pt-3">
          <p className="text-[11px] text-muted-foreground">{t("loyalty.spend")}</p>
          <p className="font-display text-lg font-extrabold">{formatKz(stats.spend)}</p>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {t("loyalty.rule", {
            gold: formatKz(GOLD_MIN_SPEND),
            platinum: formatKz(PLATINUM_ABOVE_SPEND),
          })}
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

/** Lado do cliente, na página do restaurante: o nível atual (se Gold ou
 * Platina) e quanto falta para o seguinte. */
export function OwnLoyaltyStatus({
  stats,
  restaurantName,
}: {
  stats: LoyaltyStats | undefined;
  restaurantName: string;
}) {
  const { t } = useTranslation();
  if (!stats || stats.spend <= 0) return null;
  const next = nextTier(stats.spend);
  const current = isPremiumTier(stats.tier) ? stats.tier : null;
  const s = current ? TIER_STYLE[current] : null;

  return (
    <div className={`rounded-xl border px-4 py-3 ${s ? s.box : "border-border bg-card"}`}>
      {current && s ? (
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <s.Icon className={`h-5 w-5 shrink-0 ${s.icon}`} />
          {t(`loyalty.youAre.${current}`, { name: restaurantName })}
        </p>
      ) : (
        <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Crown className="h-4 w-4 text-star" />
          {t("loyalty.progressTitle")}
        </p>
      )}
      {next && (
        <>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(next.ratio * 100)}
          >
            <div
              className={`h-full rounded-full ${next.tier === "platinum" ? "bg-primary" : "bg-star"}`}
              style={{ width: `${next.ratio * 100}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {t(`loyalty.remaining.${next.tier}`, { spend: formatKz(next.remaining) })}
          </p>
        </>
      )}
    </div>
  );
}

/** Perfil do cliente: restaurantes onde já é Gold ou Platina. Nada, se nenhum. */
export function OwnPremiumRestaurants() {
  const { t } = useTranslation();
  const loyalty = useOwnLoyalty();
  const { data: restaurants = [] } = useRestaurants();
  const premium = restaurants
    .map((r) => ({ r, tier: loyalty.get(r.id)?.tier }))
    .filter((x): x is { r: (typeof restaurants)[number]; tier: PremiumTier } =>
      isPremiumTier(x.tier),
    )
    .sort((a, b) => (a.tier === b.tier ? 0 : a.tier === "platinum" ? -1 : 1));
  if (premium.length === 0) return null;

  return (
    <section className="card-soft mt-6 border-star/50 p-6">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold text-primary">
        <Crown className="h-5 w-5 fill-star text-star" />
        {t("loyalty.profileTitle")}
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">{t("loyalty.profileHint")}</p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {premium.map(({ r, tier }) => {
          const s = TIER_STYLE[tier];
          return (
            <li key={r.id}>
              <Link
                to="/restaurantes/$id"
                params={{ id: r.id }}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-opacity hover:opacity-80 ${s.pill}`}
              >
                <s.Icon className={`h-3.5 w-3.5 ${s.icon}`} />
                {r.name} · {t(`loyalty.${tier}`)}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
