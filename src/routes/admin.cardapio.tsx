import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeading } from "@/components/admin-shell";
import { Switch } from "@/components/ui/switch";
import { getMenuItemsByRestaurant } from "@/data/helpers";
import { formatKz } from "@/lib/format";
import { useMenuAdmin } from "@/lib/menu-admin";
import { useRestaurantAdmin } from "@/lib/restaurant-admin";

export const Route = createFileRoute("/admin/cardapio")({
  head: () => ({ meta: [{ title: "Cardápio — Painel Kino.com" }] }),
  component: AdminCardapio,
});

function AdminCardapio() {
  const { restaurant } = useRestaurantAdmin();
  const { isAvailable, toggleAvailability } = useMenuAdmin();

  if (!restaurant) return null;

  const items = getMenuItemsByRestaurant(restaurant.id);
  const categories = [...new Set(items.map((i) => i.category))];

  return (
    <div className="pb-16">
      <AdminPageHeading
        eyebrow="Cardápio"
        title="Os seus pratos"
        description='Desligue um prato quando esgotar — some da app na hora, com o selo "Indisponível".'
      />

      <div className="mx-auto mt-8 max-w-4xl space-y-8 px-4 md:px-6">
        {categories.map((category) => (
          <section key={category}>
            <h2 className="text-lg font-extrabold text-primary">{category}</h2>
            <div className="mt-3 card-soft divide-y divide-border">
              {items
                .filter((i) => i.category === category)
                .map((item) => {
                  const available = isAvailable(item.id);
                  return (
                    <div key={item.id} className="flex items-center gap-3 p-4">
                      <img
                        src={item.image}
                        alt=""
                        className={`h-12 w-12 shrink-0 rounded-lg bg-surface object-contain ${
                          available ? "" : "grayscale opacity-60"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-foreground">{item.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatKz(item.price)} · {item.portionInfo}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span
                          className={`text-xs font-semibold ${
                            available ? "text-success" : "text-muted-foreground"
                          }`}
                        >
                          {available ? "Disponível" : "Indisponível"}
                        </span>
                        <Switch
                          checked={available}
                          onCheckedChange={() => toggleAvailability(item.id)}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>
        ))}

        {items.length === 0 && (
          <div className="card-soft grid place-items-center gap-3 p-12 text-center">
            <p className="text-sm text-muted-foreground">Este restaurante ainda não tem pratos.</p>
          </div>
        )}
      </div>
    </div>
  );
}
