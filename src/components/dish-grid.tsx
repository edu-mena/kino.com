import { Link } from "@tanstack/react-router";
import { Plus, Star, Tag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { formatKz, getPromo, promoPrice, type Dish } from "@/lib/mock-data";
import { useCart } from "@/lib/cart";

const PAGE = 12; // 3 colunas x 4 linhas no mobile

function GridDishCard({ dish }: { dish: Dish }) {
  const { add } = useCart();
  const discount = getPromo(dish.id);

  return (
    <div className="card-soft group relative flex min-w-0 flex-col p-2">
      {discount ? (
        <span className="absolute left-1.5 top-1.5 z-10 rounded-full bg-brand px-1.5 py-0.5 text-[9px] font-bold text-brand-foreground sm:text-[10px]">
          -{discount}%
        </span>
      ) : null}
      <Link
        to="/prato/$dishId"
        params={{ dishId: dish.id }}
        className="block rounded-lg bg-surface p-1"
      >
        <img
          src={dish.image}
          alt={dish.name}
          loading="lazy"
          width={512}
          height={512}
          className="mx-auto h-16 w-full object-contain transition-transform duration-300 group-hover:scale-105 sm:h-20"
        />
      </Link>
      <Link
        to="/prato/$dishId"
        params={{ dishId: dish.id }}
        className="mt-1.5 block truncate font-display text-xs font-bold text-foreground sm:text-sm"
      >
        {dish.name}
      </Link>
      <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
        {dish.rating}
        <Star className="h-2.5 w-2.5 fill-star text-star" />
      </p>
      <div className="mt-1.5 flex items-end justify-between gap-1">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-primary sm:text-sm">
            {formatKz(promoPrice(dish))}
          </p>
          {discount ? (
            <p className="truncate text-[10px] text-muted-foreground line-through">
              {formatKz(dish.price)}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          aria-label={`Adicionar ${dish.name} ao carrinho`}
          onClick={() => {
            add(dish.id, 1, []);
            toast.success(`${dish.name} adicionado ao carrinho`);
          }}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105 active:scale-95"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function PromoTile({ title, note }: { title: string; note: string }) {
  return (
    <Link
      to="/ofertas"
      className="flex min-w-0 flex-col justify-between rounded-2xl bg-primary p-3 text-primary-foreground transition-transform hover:scale-[1.02]"
    >
      <span className="grid h-7 w-7 place-items-center rounded-full bg-brand text-brand-foreground">
        <Tag className="h-3.5 w-3.5" />
      </span>
      <p className="mt-3 font-display text-lg font-extrabold leading-tight sm:text-xl">{title}</p>
      <p className="mt-1 truncate text-[10px] opacity-90 sm:text-xs">{note}</p>
    </Link>
  );
}

const promoTiles = [
  { at: 4, title: "20% OFF", note: "Código KINO20" },
  { at: 10, title: "Entrega grátis", note: "Acima de AOA 10.000" },
  { at: 17, title: "Happy Hour", note: "Bebidas -15%" },
];

export function DishGrid({ dishes }: { dishes: Dish[] }) {
  const [pages, setPages] = useState(1);
  const visible = pages * PAGE;

  const cells: Array<{ key: string; node: React.ReactNode }> = [];
  dishes.slice(0, visible).forEach((dish, i) => {
    const promo = promoTiles.find((p) => p.at === i);
    if (promo) {
      cells.push({
        key: `promo-${promo.at}`,
        node: <PromoTile title={promo.title} note={promo.note} />,
      });
    }
    cells.push({ key: `${dish.id}-${i}`, node: <GridDishCard dish={dish} /> });
  });

  return (
    <div>
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
        {cells.map((c) => (
          <div key={c.key} className="min-w-0">
            {c.node}
          </div>
        ))}
      </div>
      {visible < dishes.length ? (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setPages((p) => p + 1)}
            className="rounded-full border border-border bg-card px-6 py-2.5 text-sm font-semibold text-primary transition-colors hover:border-brand hover:text-brand"
          >
            Ver mais
          </button>
        </div>
      ) : null}
    </div>
  );
}
