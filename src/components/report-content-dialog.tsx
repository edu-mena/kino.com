import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  REPORT_REASONS,
  reportContent,
  type ReportableType,
  type ReportReason,
} from "@/data/api-moderation";
import { useTranslation } from "@/i18n";
import { ApiError } from "@/lib/api-client";
import { getAuthToken } from "@/lib/auth";

/**
 * "Denunciar" uma avaliação, story ou promoção (App Store 1.2) — funciona
 * com ou sem sessão. A equipa Luku recebe a denúncia e decide em
 * /sistema/denuncias; uma avaliação denunciada por várias pessoas sai do
 * público logo (backend ModerationService).
 */
export function ReportContentDialog({
  type,
  contentId,
  open,
  onOpenChange,
}: {
  type: ReportableType;
  contentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);

  const close = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      setReason(null);
      setDetails("");
    }
  };

  const submit = async () => {
    if (!reason) return;
    setSending(true);
    try {
      await reportContent(type, contentId, { reason, details }, getAuthToken());
      toast.success(t("moderation.reportSent"));
      close(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t("moderation.reportError"));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-sm rounded-[1.5rem] border-none bg-card p-6">
        <DialogTitle className="font-display text-lg font-bold">
          {t("moderation.reportTitle")}
        </DialogTitle>
        <DialogDescription>{t("moderation.reportDescription")}</DialogDescription>

        <div role="radiogroup" className="space-y-2">
          {REPORT_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={reason === r}
              onClick={() => setReason(r)}
              className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-colors ${
                reason === r
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-foreground hover:border-primary/50"
              }`}
            >
              {t(`moderation.reason.${r}`)}
            </button>
          ))}
        </div>

        <Textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder={t("moderation.detailsPlaceholder")}
        />

        <Button
          type="button"
          onClick={submit}
          disabled={!reason || sending}
          className="w-full rounded-xl"
        >
          {sending ? t("moderation.sending") : t("moderation.send")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
