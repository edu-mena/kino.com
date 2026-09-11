import { Eye } from "lucide-react";
import { LazyImage } from "@/components/lazy-image";
import type { MenuItem } from "@/data/types";
import { useAddToBill } from "@/lib/bill";
import { formatKz } from "@/lib/format";
import { useMenuAdmin } from "@/lib/menu-admin";
import { useRestaurantStatus } from "@/lib/restaurant-status";
import { useTranslation } from "@/i18n";

/**
 * Linha compacta da visão em lista do cardápio (dentro da página de UM
 * restaurante — ver `MenuBrowser`/`viewMode`). Miniatura com ícone de olho
 * (clicar abre o detalhe, via `onViewDetail`) + nome (clicar adiciona
 * direto ao pedido, igual ao "+" da visão em cartões) + preço.
 */
export function DishListRow({
  item,
  onViewDetail,
}: {
  item: MenuItem;
  onViewDetail: (item: MenuItem) => void;
}) {
  const { t } = useTranslation();
  const addToBill = useAddToBill();
  const { isAvailable } = useMenuAdmin();
  const restaurantStatus = useRestaurantStatus(item.restaurantId);
  const available = item.isAvailable && isAvailable(item.id) && restaurantStatus.available;

  return (
    <div className="flex items-center gap-3 p-[5px]">
      <button
        type="button"
        onClick={() => onViewDetail(item)}
        aria-label={t("cardapio.viewDishDetail", { name: item.name })}
        className="group relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-surface"
      >
        <LazyImage
          src={item.image}
          alt={item.name}
          width={88}
          height={88}
          widths={[44, 88]}
          sizes="44px"
          className="h-full w-full object-cover"
        />
        <span className="absolute inset-0 grid place-items-center bg-black/0 text-transparent transition-colors group-hover:bg-black/40 group-hover:text-white">
          <Eye className="h-4 w-4" />
        </span>
      </button>
      <button
        type="button"
        disabled={!available}
        onClick={() => addToBill(item.restaurantId, item.id, item.name)}
        aria-label={t("dishCard.addAria", { name: item.name })}
        className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-foreground transition-colors hover:text-primary disabled:pointer-events-none disabled:opacity-50"
      >
        {item.name}
      </button>
      <span className="shrink-0 text-sm font-bold text-primary">{formatKz(item.price)}</span>
    </div>
  );
}
