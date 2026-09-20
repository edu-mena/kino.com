<?php

namespace App\Observers;

use App\Models\Review;

/** Recalcula `restaurants.rating`/`review_count` (desnormalizados, nunca
 * editáveis via API — ver Restaurant model) sempre que uma review nasce ou
 * é apagada (moderação). Espelha `blendedRating()` do mock. */
class ReviewObserver
{
    public function saved(Review $review): void
    {
        $this->recalculate($review);
    }

    public function deleted(Review $review): void
    {
        $this->recalculate($review);
    }

    private function recalculate(Review $review): void
    {
        $restaurant = $review->restaurant;
        $average = $restaurant->reviews()->avg('rating');

        $restaurant->forceFill([
            'rating' => $average === null ? null : round($average, 1),
            'review_count' => $restaurant->reviews()->count(),
        ])->saveQuietly();
    }
}
