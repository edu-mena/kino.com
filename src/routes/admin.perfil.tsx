import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Bike, Clock, Mail, MapPin, Phone, Shield, Star, Store } from "lucide-react";
import { AdminPageHeading } from "@/components/admin-shell";
import { getDeliveryZones } from "@/data/helpers";
import { formatKz } from "@/lib/format";
import { useRestaurantAdmin } from "@/lib/restaurant-admin";

export const Route = createFileRoute("/admin/perfil")({
  head: () => ({ meta: [{ title: "Restaurante — Painel Kino.com" }] }),
  component: AdminPerfil,
});

function AdminPerfil() {
  const { restaurant, logout } = useRestaurantAdmin();
  const navigate = useNavigate();
  if (!restaurant) return null;

  const handleLogout = () => {
    logout();
    navigate({ to: "/admin/entrar" });
  };

  const rows = [
    { icon: Store, label: "Cozinha", value: `${restaurant.cuisine} · ${restaurant.priceLevel}` },
    { icon: MapPin, label: "Morada", value: `${restaurant.address}, ${restaurant.neighborhood}` },
    { icon: Clock, label: "Horário", value: restaurant.openingHours },
    { icon: Phone, label: "Telefone", value: restaurant.phone },
    { icon: Mail, label: "Email", value: restaurant.email },
    {
      icon: Bike,
      label: "Entrega",
      value: restaurant.isDeliveryAvailable
        ? `${formatKz(restaurant.deliveryFee)} · ~${restaurant.estimatedDeliveryMinutes} min · ${getDeliveryZones(restaurant).join(", ")}`
        : "Sem entrega — só no local",
    },
    {
      icon: Shield,
      label: "Caução de reserva",
      value:
        restaurant.cautionAmount > 0
          ? `${formatKz(restaurant.cautionAmount)} — ${restaurant.cautionPolicyNotice}`
          : "Sem caução",
    },
  ];

  return (
    <div className="pb-16">
      <AdminPageHeading eyebrow="Restaurante" title="Perfil do restaurante" />

      <div className="mx-auto mt-8 max-w-4xl space-y-6 px-4 md:px-6">
        <div className="card-soft overflow-hidden">
          <div className="relative h-40">
            <img src={restaurant.coverImage} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5">
              <h2 className="font-display text-2xl font-extrabold text-white">{restaurant.name}</h2>
              <p className="flex items-center gap-1 text-sm text-white/90">
                <Star className="h-3.5 w-3.5 fill-star text-star" />
                {restaurant.rating} ({restaurant.reviewCount} avaliações)
              </p>
            </div>
          </div>
          <p className="p-5 text-sm text-muted-foreground">{restaurant.description}</p>
        </div>

        <div className="card-soft divide-y divide-border">
          {rows.map((row) => (
            <div key={row.label} className="flex items-start gap-3 p-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface text-primary">
                <row.icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {row.label}
                </p>
                <p className="mt-0.5 text-sm text-foreground">{row.value}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Dados geridos centralmente pela Kino — para alterar, contacte o suporte de parceiros.
        </p>

        <button
          type="button"
          onClick={handleLogout}
          className="mx-auto block rounded-xl border border-dashed border-border px-5 py-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
        >
          Sair do painel
        </button>
      </div>
    </div>
  );
}
