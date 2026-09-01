import { Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { addReview } from "@/data/reviews-store";
import { useTranslation } from "@/i18n";
import { useAuth } from "@/lib/auth";

const QUICK_TAGS = ["Comida boa", "Bom atendimento", "Rápido", "Preço justo", "Ambiente"];

export function ReviewDialog({
  open,
  onOpenChange,
  restaurantId,
  restaurantName,
  /** "order:<id>" | "reservation:<id>" — marca a origem como avaliada. */
  sourceRef,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId: string;
  restaurantName: string;
  sourceRef?: string;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const reset = () => {
    setRating(0);
    setHover(0);
    setComment("");
    setTags([]);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1) {
      toast.error(t("reviewDialog.pickRating"));
      return;
    }
    addReview(
      {
        restaurantId,
        rating,
        comment,
        tags,
        customerName: user?.name ?? "Cliente Kino",
      },
      sourceRef,
    );
    toast.success(t("reviewDialog.sentToast"));
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : (reset(), onOpenChange(o)))}>
      <DialogContent className="max-w-sm rounded-[1.5rem] border-none bg-card p-6">
        <DialogTitle className="font-display text-lg font-bold">
          {t("reviewDialog.title", { name: restaurantName })}
        </DialogTitle>
        <DialogDescription>{t("reviewDialog.description")}</DialogDescription>

        <form onSubmit={submit} className="mt-2 space-y-4">
          <div className="flex justify-center gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={t("reviewDialog.starAria", { n })}
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                className="p-0.5"
              >
                <Star
                  className={`h-8 w-8 transition-colors ${
                    n <= (hover || rating) ? "fill-star text-star" : "text-border"
                  }`}
                />
              </button>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-1.5">
            {QUICK_TAGS.map((tag) => {
              const on = tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() =>
                    setTags((cur) => (on ? cur.filter((x) => x !== tag) : [...cur, tag]))
                  }
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    on
                      ? "border-brand bg-brand/10 text-brand"
                      : "border-border text-muted-foreground hover:border-primary"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>

          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t("reviewDialog.commentPlaceholder")}
            className="rounded-xl"
          />

          <Button type="submit" className="w-full rounded-xl">
            {t("reviewDialog.submit")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
