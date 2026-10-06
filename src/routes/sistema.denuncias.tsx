import { createFileRoute } from "@tanstack/react-router";
import { EyeOff, Flag, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SystemPageHeading } from "@/components/system-shell";
import { Button } from "@/components/ui/button";
import {
  fetchModerationQueue,
  resolveReport,
  type ModerationItem,
  type ReportReason,
} from "@/data/api-moderation";
import { useTranslation } from "@/i18n";
import { ApiError, hasRealBackend } from "@/lib/api-client";
import { BCP47 } from "@/lib/week";
import { useSystemAdmin } from "@/lib/system-admin";

export const Route = createFileRoute("/sistema/denuncias")({
  head: () => ({ meta: [{ title: "Denúncias — Sistema Luku.com" }] }),
  component: SistemaDenuncias,
});

/**
 * Fila de moderação (App Store 1.2) — um cartão por conteúdo denunciado,
 * mais antigo primeiro. "Remover" esconde a avaliação / apaga a story ou
 * promoção; "Manter" rejeita as denúncias (e repõe uma avaliação escondida
 * automaticamente). Os Termos prometem resposta em 24h — por isso o email
 * à equipa em cada 1ª denúncia (backend ModerationService).
 */
function SistemaDenuncias() {
  const { t, locale } = useTranslation();
  const { token } = useSystemAdmin();
  const [items, setItems] = useState<ModerationItem[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => {
    if (!hasRealBackend || !token) return;
    fetchModerationQueue(token)
      .then(setItems)
      .catch(() => setItems([]));
  };
  useEffect(load, [token]);

  const decide = async (item: ModerationItem, action: "remove" | "dismiss") => {
    if (!token) return;
    setBusy(item.contentId);
    try {
      await resolveReport(item.type, item.contentId, action, token);
      toast.success(t(action === "remove" ? "moderation.removedToast" : "moderation.keptToast"));
      setItems((prev) => prev?.filter((i) => i.contentId !== item.contentId) ?? null);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t("moderation.reportError"));
    } finally {
      setBusy(null);
    }
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(BCP47[locale], {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="pb-16">
      <SystemPageHeading
        eyebrow={t("moderation.queueEyebrow")}
        title={t("moderation.queueTitle")}
        description={t("moderation.queueDescription")}
      />

      <div className="mx-auto mt-6 max-w-4xl space-y-4 px-4 md:px-6">
        {items === null ? null : items.length === 0 ? (
          <div className="card-soft p-8 text-center text-sm text-muted-foreground">
            {t("moderation.queueEmpty")}
          </div>
        ) : (
          items.map((item) => (
            <article key={`${item.type}:${item.contentId}`} className="card-soft p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-destructive">
                    <Flag className="mr-1 inline h-3 w-3" />
                    {t(`moderation.type.${item.type}`)} ·{" "}
                    {t("moderation.reportsCount", { count: String(item.reportsCount) })}
                  </span>
                  {item.hidden && (
                    <span className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                      <EyeOff className="mr-1 inline h-3 w-3" />
                      {t("moderation.autoHidden")}
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{fmt(item.firstReportedAt)}</span>
              </div>

              <p className="mt-3 text-xs font-semibold text-muted-foreground">
                {item.preview.restaurant}
                {item.preview.author && ` · ${item.preview.author}`}
                {item.preview.rating !== undefined && (
                  <span className="ml-2 inline-flex items-center gap-0.5">
                    <Star className="h-3 w-3 fill-star text-star" /> {item.preview.rating}
                  </span>
                )}
              </p>
              {item.preview.mediaUrl &&
                (item.preview.mediaType === "video" ? (
                  <video
                    src={item.preview.mediaUrl}
                    controls
                    className="mt-3 max-h-64 rounded-xl"
                  />
                ) : (
                  <img
                    src={item.preview.mediaUrl}
                    alt=""
                    className="mt-3 max-h-64 rounded-xl object-contain"
                  />
                ))}
              {item.preview.text && (
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                  {item.preview.text}
                </p>
              )}
              {item.preview.reply && (
                <p className="mt-2 rounded-xl bg-surface p-3 text-sm text-foreground">
                  {item.preview.reply}
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-1.5">
                {Object.entries(item.reasons).map(([reason, n]) => (
                  <span
                    key={reason}
                    className="rounded-full bg-surface px-2.5 py-1 text-xs text-foreground"
                  >
                    {t(`moderation.reason.${reason as ReportReason}`)} × {n}
                  </span>
                ))}
              </div>
              {item.details.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                  {item.details.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              )}

              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy === item.contentId}
                  onClick={() => decide(item, "dismiss")}
                  className="rounded-xl"
                >
                  {t("moderation.keep")}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={busy === item.contentId}
                  onClick={() => decide(item, "remove")}
                  className="rounded-xl"
                >
                  {t("moderation.remove")}
                </Button>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
