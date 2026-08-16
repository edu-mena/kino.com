import { Link } from "@tanstack/react-router";
import { Plus, Star } from "lucide-react";
import { toast } from "sonner";
import { formatKz, getPromo, promoPrice, type Dish } from "@/lib/mock-data";
import { useCart } from "@/lib/cart";

function MiniDishCard({ dish }: { dish: Dish }) {
  const { add } = useCart();
  const discount = getPromo(dish.id);

  return (
    <div className="card-soft group relative w-44 shrink-0 p-2.5 sm:w-48">
      {discount ? (
        <span className="absolute left-2 top-2 z-10 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-brand-foreground">
          -{discount}%
        </span>
      ) : null}
      <Link
        to="/prato/$dishId"
        params={{ dishId: dish.id }}
        className="block rounded-xl bg-surface p-1.5"
      >
        <img
          src={dish.image}
          alt={dish.name}
          loading="lazy"
          width={768}
          height={768}
          className="mx-auto h-20 w-full object-contain transition-transform duration-300 group-hover:scale-105"
        />
      </Link>
      <Link
        to="/prato/$dishId"
        params={{ dishId: dish.id }}
        className="mt-2 block truncate font-display text-sm font-bold text-foreground"
      >
        {dish.name}
      </Link>
      <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
        {dish.rating}
        <Star className="h-3 w-3 fill-star text-star" />
        <span className="truncate">· {dish.restaurant}</span>
      </p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-bold text-primary">
          {formatKz(promoPrice(dish))}
          {discount ? (
            <span className="ml-1 text-[11px] font-medium text-muted-foreground line-through">
              {formatKz(dish.price)}
            </span>
          ) : null}
        </p>
        <button
          type="button"
          aria-label={`Adicionar ${dish.name} ao carrinho`}
          onClick={() => {
            add(dish.id, 1, []);
            toast.success(`${dish.name} adicionado ao carrinho`);
          }}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105 active:scale-95"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function DishCarousel({
  dishes,
  reverse = false,
}: {
  dishes: Dish[];
  reverse?: boolean;
}) {
  return (
    <div className="marquee-mask group/marquee overflow-hidden">
      <div
        className={`marquee-track gap-4 py-1 group-hover/marquee:[animation-play-state:paused] motion-reduce:animate-none ${
          reverse ? "[animation-direction:reverse]" : ""
        }`}
      >
        {[...dishes, ...dishes].map((dish, i) => (
          <MiniDishCard key={`${dish.id}-${i}`} dish={dish} />
        ))}
      </div>
    </div>
  );
}