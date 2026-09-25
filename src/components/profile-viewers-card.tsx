import { formatDistanceToNow } from "date-fns";
import { enUS, fr as frLocale, ptBR } from "date-fns/locale";
import { Check, Eye, UserCheck, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { TrendBadge } from "@/components/admin-stats";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { ProfileViewerRow } from "@/data/api-profile-views";
import { useTranslation } from "@/i18n";
import { useProfileViewsSummary } from "@/lib/profile-views";

const dateLocales = { pt: ptBR, en: enUS, fr: frLocale };
const PREVIEW = 5;

/**
 * "Quem viu o seu perfil" como última secção do painel: visitantes da
 * semana (com variação face à anterior), os últimos visitantes pelo nome e
 * o convite "siga-nos". O restaurante vê só nomes — nunca contactos.
 */
export function ProfileViewersCard({ restaurantId }: { restaurantId: string }) {
  const { t, locale } = useTranslation();
  const { summary, loading, invite } = useProfileViewsSummary(restaurantId);
  const [allOpen, setAllOpen] = useState(false);
  const { totals, viewers, invitesLeftToday } = summary;

  const delta =
    totals.prevWeek > 0
      ? Math.round(((totals.week - totals.prevWeek) / totals.prevWeek) * 100)
      : null;

  const relTime = (iso: string) =>
    formatDistanceToNow(new Date(iso), { addSuffix: true, locale: dateLocales[locale] });

  const onInvite = async (v: ProfileViewerRow) => {
    const ok = await invite(v.id);
    const name = v.name ?? t("profileViewers.guest");
    if (ok) toast.success(t("profileViewers.invitedToast", { name }));
    else toast.error(t("profileViewers.inviteFailedToast"));
  };

  const row = (v: ProfileViewerRow) => (
    <li key={v.id} className="flex items-center gap-3 py-2.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
        {(v.name?.[0] ?? "?").toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {v.name ?? t("profileViewers.guest")}
        </p>
        <p className="text-xs text-muted-foreground">
          {relTime(v.lastAt)}
          {v.visits > 1 && ` · ${t("profileViewers.visits", { count: v.visits })}`}
        </p>
      </div>
      <InviteAction viewer={v} onInvite={() => void onInvite(v)} />
    </li>
  );

  return (
    <section className="mt-8">
      <div className="card-soft overflow-hidden border-brand/40">
        <div className="flex flex-wrap items-start gap-4 p-5 sm:p-6">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
            <Eye className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-bold text-foreground">
              {t("profileViewers.title")}
            </h2>
            <p className="text-xs text-muted-foreground">{t("profileViewers.hint")}</p>
          </div>
          <div className="flex items-center gap-2">
            <p className="font-display text-4xl font-extrabold text-brand">{totals.week}</p>
            <div className="text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">{t("profileViewers.weekLabel")}</p>
              <TrendBadge delta={delta} label={t("profileViewers.vsPrevWeek")} />
            </div>
          </div>
        </div>

        <dl className="grid grid-cols-3 border-y border-border text-center">
          {[
            { label: t("profileViewers.today"), value: totals.today },
            { label: t("profileViewers.newThisWeek"), value: totals.newThisWeek },
            { label: t("profileViewers.total"), value: totals.total },
          ].map((s, i) => (
            <div key={s.label} className={`px-3 py-3 ${i > 0 ? "border-l border-border" : ""}`}>
              <dd className="font-display text-xl font-extrabold text-foreground">{s.value}</dd>
              <dt className="text-[11px] text-muted-foreground">{s.label}</dt>
            </div>
          ))}
        </dl>

        <div className="px-5 pb-4 sm:px-6">
          {!loading && viewers.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t("profileViewers.empty")}
            </p>
          ) : (
            <ul className="divide-y divide-border">{viewers.slice(0, PREVIEW).map(row)}</ul>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
            <span>{t("profileViewers.invitesLeft", { count: invitesLeftToday })}</span>
            {viewers.length > PREVIEW && (
              <button
                type="button"
                onClick={() => setAllOpen(true)}
                className="font-semibold text-primary hover:underline"
              >
                {t("profileViewers.seeAll", { count: viewers.length })}
              </button>
            )}
          </div>
        </div>
      </div>

      <Dialog open={allOpen} onOpenChange={setAllOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogTitle>{t("profileViewers.title")}</DialogTitle>
          <ul className="divide-y divide-border">{viewers.map(row)}</ul>
        </DialogContent>
      </Dialog>
    </section>
  );
}

/** Botão "Convidar a seguir", ou o estado que o impede (já segue, sem conta,
 * convidado há pouco...) — o motivo aparece como dica ao passar o rato. */
function InviteAction({ viewer, onInvite }: { viewer: ProfileViewerRow; onInvite: () => void }) {
  const { t } = useTranslation();
  const { canInvite, blockReason } = viewer.invite;

  if (viewer.following) {
    return (
      <span className="flex shrink-0 items-center gap-1 rounded-full bg-success/15 px-2 py-1 text-[11px] font-semibold text-success">
        <UserCheck className="h-3.5 w-3.5" />
        {t("profileViewers.following")}
      </span>
    );
  }
  if (canInvite) {
    return (
      <button
        type="button"
        onClick={onInvite}
        className="flex shrink-0 items-center gap-1 rounded-xl border border-primary px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/5"
      >
        <UserPlus className="h-3.5 w-3.5" />
        {t("profileViewers.invite")}
      </button>
    );
  }
  if (blockReason === "recent") {
    return (
      <span
        title={t("profileViewers.reason.recent")}
        className="flex shrink-0 items-center gap-1 rounded-full bg-surface px-2 py-1 text-[11px] font-semibold text-muted-foreground"
      >
        <Check className="h-3.5 w-3.5" />
        {t("profileViewers.invited")}
      </span>
    );
  }
  if (blockReason === "guest") return null;
  return (
    <span
      title={blockReason ? t(`profileViewers.reason.${blockReason}`) : undefined}
      className="shrink-0 rounded-full bg-surface px-2 py-1 text-[11px] font-semibold text-muted-foreground"
    >
      {blockReason ? t(`profileViewers.reasonShort.${blockReason}`) : ""}
    </span>
  );
}
