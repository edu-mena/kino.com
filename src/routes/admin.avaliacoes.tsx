import { createFileRoute } from "@tanstack/react-router";
import { MessageSquareReply, Pencil, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AdminPageHeading } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getReviewsForRestaurant } from "@/data/helpers";
import { setReviewReply } from "@/data/reviews-store";
import type { Review } from "@/data/types";
import { useTranslation } from "@/i18n";
import { useRestaurantAdmin } from "@/lib/restaurant-admin";

export const Route = createFileRoute("/admin/avaliacoes")({
  head: () => ({ meta: [{ title: "Avaliações — Painel Luku.com" }] }),
  component: AdminAvaliacoes,
});

/** Bloco de resposta duma review — mostra a resposta existente (com
 * editar/remover) ou o formulário para escrever uma nova. Estado próprio
 * (não sobe para `AdminAvaliacoes`) porque só uma review de cada vez
 * interessa estar em edição. */
function ReviewReplyBlock({ review, onChanged }: { review: Review; onChanged: () => void }) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(review.reply?.text ?? "");

  const save = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setReviewReply(review.id, trimmed);
    onChanged();
    setEditing(false);
    toast.success(t("adminAvaliacoes.replySavedToast"));
  };

  const remove = () => {
    setReviewReply(review.id, null);
    onChanged();
    setEditing(false);
    setDraft("");
    toast.success(t("adminAvaliacoes.replyRemovedToast"));
  };

  if (editing) {
    return (
      <div className="mt-4 space-y-2 rounded-xl border border-border bg-surface p-3">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("adminAvaliacoes.replyPlaceholder")}
          rows={3}
          autoFocus
          className="rounded-lg bg-card"
        />
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() => {
              setEditing(false);
              setDraft(review.reply?.text ?? "");
            }}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!draft.trim()}
            className="rounded-lg"
            onClick={save}
          >
            {t("adminAvaliacoes.replySubmit")}
          </Button>
        </div>
      </div>
    );
  }

  if (review.reply) {
    return (
      <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-primary">
            {t("adminAvaliacoes.yourReply")}
          </p>
          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label={t("adminAvaliacoes.editReplyAria")}
              className="text-muted-foreground transition-colors hover:text-primary"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={remove}
              aria-label={t("adminAvaliacoes.removeReplyAria")}
              className="text-muted-foreground transition-colors hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <p className="mt-1.5 whitespace-pre-wrap text-sm text-foreground">{review.reply.text}</p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
    >
      <MessageSquareReply className="h-3.5 w-3.5" />
      {t("adminAvaliacoes.replyCta")}
    </button>
  );
}

function AdminAvaliacoes() {
  const { restaurant } = useRestaurantAdmin();
  const { t } = useTranslation();
  // Incrementado a cada resposta guardada/removida — `getReviewsForRestaurant`
  // é síncrono sobre o localStorage, não reativo sozinho; isto força
  // recalcular a lista (mesmo padrão usado nos outros stores "puros" desta
  // app, ver `menu-admin.tsx`).
  const [, forceRefresh] = useState(0);

  if (!restaurant) return null;

  const reviews = getReviewsForRestaurant(restaurant.id);

  return (
    <div className="pb-16">
      <AdminPageHeading
        eyebrow={t("adminAvaliacoes.eyebrow")}
        title={t("adminAvaliacoes.title")}
        description={t("adminAvaliacoes.description")}
        action={
          <div className="card-soft flex items-center gap-2 px-4 py-2.5">
            <Star className="h-4 w-4 fill-star text-star" />
            <span className="font-display text-lg font-bold text-primary">{restaurant.rating}</span>
            <span className="text-xs text-muted-foreground">({restaurant.reviewCount})</span>
          </div>
        }
      />

      <div className="mx-auto mt-8 max-w-4xl space-y-3 px-4 md:px-6">
        {reviews.length === 0 && (
          <div className="card-soft grid place-items-center gap-3 p-12 text-center">
            <Star className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("adminAvaliacoes.emptyText")}</p>
          </div>
        )}

        {reviews.map((review) => (
          <div key={review.id} className="card-soft p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-display text-sm font-bold text-foreground">
                {review.customerName}
              </p>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${
                        i < review.rating ? "fill-star text-star" : "text-border"
                      }`}
                    />
                  ))}
                </span>
                <span className="text-xs text-muted-foreground">{review.date}</span>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{review.comment}</p>
            {review.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {review.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-surface px-3 py-1 text-xs font-medium text-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <ReviewReplyBlock review={review} onChanged={() => forceRefresh((n) => n + 1)} />
          </div>
        ))}
      </div>
    </div>
  );
}
