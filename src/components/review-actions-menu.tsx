import { Ban, Flag, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ReportContentDialog } from "@/components/report-content-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { blockReviewAuthor } from "@/data/api-moderation";
import type { Review } from "@/data/types";
import { useTranslation } from "@/i18n";
import { ApiError, hasRealBackend } from "@/lib/api-client";
import { getAuthToken } from "@/lib/auth";

/** "⋯" de cada avaliação pública: denunciar (todos) e bloquear o autor (quem
 * tem sessão e não é o autor — `authorBlockable` vem do backend). */
export function ReviewActionsMenu({ review }: { review: Review }) {
  const { t } = useTranslation();
  const [reportOpen, setReportOpen] = useState(false);

  if (!hasRealBackend) return null;

  const block = async () => {
    const token = getAuthToken();
    if (!token || !window.confirm(t("moderation.blockConfirm", { name: review.customerName })))
      return;
    try {
      await blockReviewAuthor(review.id, token);
      toast.success(t("moderation.blocked", { name: review.customerName }));
      // `useReviews` volta a buscar — as avaliações do bloqueado somem.
      window.dispatchEvent(new Event("luku:menu-changed"));
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t("moderation.blockError"));
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={t("moderation.moreActions")}
          className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setReportOpen(true)}>
            <Flag className="mr-2 h-4 w-4" /> {t("moderation.report")}
          </DropdownMenuItem>
          {review.authorBlockable && (
            <DropdownMenuItem onSelect={block} className="text-destructive">
              <Ban className="mr-2 h-4 w-4" />{" "}
              {t("moderation.blockAuthor", { name: review.customerName })}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <ReportContentDialog
        type="review"
        contentId={review.id}
        open={reportOpen}
        onOpenChange={setReportOpen}
      />
    </>
  );
}
