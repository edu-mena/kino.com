import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Store } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import icon from "@/assets/icon.png";
import { Logo } from "@/components/logo";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { INITIAL_RESTAURANTS } from "@/data/mockData";
import { useRestaurantAdmin } from "@/lib/restaurant-admin";

export const Route = createFileRoute("/admin_/entrar")({
  head: () => ({
    meta: [
      { title: "Painel do restaurante — Kino.com" },
      { name: "description", content: "Aceda ao painel para gerir pedidos, reservas e cardápio." },
      { property: "og:title", content: "Painel do restaurante — Kino.com" },
      { property: "og:image", content: icon },
    ],
  }),
  component: AdminEntrar,
});

function AdminEntrar() {
  const { login } = useRestaurantAdmin();
  const navigate = useNavigate();
  const [restaurantId, setRestaurantId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId) return;
    setLoading(true);
    // Simulação: sem backend, "entrar" é só escolher qual restaurante gerir.
    setTimeout(() => {
      login(restaurantId);
      const restaurant = INITIAL_RESTAURANTS.find((r) => r.id === restaurantId);
      toast.success(`Sessão iniciada — ${restaurant?.name}`);
      navigate({ to: "/admin" });
    }, 500);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-5 py-12 sm:px-12">
      <div className="w-full max-w-sm">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar ao início
        </Link>

        <div className="mt-6">
          <Logo />
        </div>

        <h1 className="mt-6 text-3xl font-extrabold text-primary">Painel do restaurante</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Escolha o restaurante que gere para aceder aos pedidos, reservas e cardápio.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <Select value={restaurantId ?? ""} onValueChange={setRestaurantId}>
            <SelectTrigger className="h-auto rounded-xl border-border bg-card px-4 py-3.5 text-sm">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 shrink-0 text-muted-foreground" />
                <SelectValue placeholder="Selecione o seu restaurante" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {INITIAL_RESTAURANTS.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <button
            type="submit"
            disabled={!restaurantId || loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "A entrar..." : "Entrar no painel"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Ainda não é parceiro?{" "}
          <Link to="/parceiros" className="font-bold text-primary">
            Torne-se parceiro
          </Link>
        </p>
      </div>
    </div>
  );
}
