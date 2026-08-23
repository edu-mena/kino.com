import { createFileRoute } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { AdminPageHeading } from "@/components/admin-shell";
import { getReviewsForRestaurant } from "@/data/helpers";
import { useRestaurantAdmin } from "@/lib/restaurant-admin";

export const Route = createFileRoute("/admin/avaliacoes")({
  head: () => ({ meta: [{ title: "Avaliações — Painel Kino.com" }] }),
  component: AdminAvaliacoes,
});

function AdminAvaliacoes() {
  const { restaurant } = useRestaurantAdmin();
  if (!restaurant) return null;

  const reviews = getReviewsForRestaurant(restaurant.id);

  return (
    <div className="pb-16">
      <AdminPageHeading
        eyebrow="Avaliações"
        title="O que os clientes dizem"
        description="Avaliações são só de leitura — a Kino não intermedeia respostas."
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
            <p className="text-sm text-muted-foreground">Ainda não tem avaliações detalhadas.</p>
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
          </div>
        ))}
      </div>
    </div>
  );
}
