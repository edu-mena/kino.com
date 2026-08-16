import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  CreditCard,
  ChevronRight,
  Heart,
  LogOut,
  MapPin,
  Receipt,
  Settings,
  Star,
} from "lucide-react";
import icon from "@/assets/icon.png";
import { PageShell } from "@/components/site-shell";
import { useAuth } from "@/lib/auth";
import { addresses, paymentMethods } from "@/lib/mock-data";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Meu perfil — Kino.com" },
      {
        name: "description",
        content:
          "Gerencie os seus dados, endereços guardados, métodos de pagamento e histórico de pedidos no Kino.com.",
      },
      { property: "og:title", content: "Meu perfil — Kino.com" },
      { property: "og:description", content: "Endereços, pagamentos e histórico de pedidos." },
    ],
  }),
  component: Perfil,
});

const menu = [
  { label: "Histórico de pedidos", icon: Receipt },
  { label: "Favoritos", icon: Heart },
  { label: "Avaliações", icon: Star },
  { label: "Notificações", icon: Bell },
  { label: "Configurações", icon: Settings },
];

function Perfil() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate({ to: "/entrar" });
  };

  if (!user) {
    return (
      <PageShell>
        <div className="mx-auto max-w-6xl px-4 py-20 text-center">
          <h1 className="text-3xl font-bold text-primary">Acesso não autorizado</h1>
          <p className="mt-2 text-muted-foreground">Por favor, faça login primeiro.</p>
          <Link
            to="/entrar"
            className="mt-6 inline-flex rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground"
          >
            Ir para login
          </Link>
        </div>
      </PageShell>
    );
  }

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 pt-10 md:px-6">
        <div className="card-soft grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 p-6">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-primary font-display text-xl font-extrabold text-primary-foreground">
            {initials}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-extrabold text-primary">{user.name}</h1>
            <p className="truncate text-sm text-muted-foreground">
              {user.email} · {user.phone}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="card-soft divide-y divide-border">
            {menu.map((item) => (
              <button
                key={item.label}
                type="button"
                className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4 text-left"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface text-primary">
                  <item.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 truncate text-sm font-semibold">{item.label}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
            <button
              type="button"
              onClick={handleLogout}
              className="grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-3 p-4 text-left text-destructive hover:bg-destructive/5"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-destructive/10">
                <LogOut className="h-4 w-4" />
              </span>
              <span className="text-sm font-semibold">Terminar sessão</span>
            </button>
          </div>

          <div className="space-y-6">
            <section className="card-soft p-6">
              <h2 className="font-display text-lg font-bold text-primary">Endereços guardados</h2>
              <div className="mt-4 space-y-2">
                {addresses.map((a) => (
                  <div
                    key={a.id}
                    className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-xl border border-border p-3"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface text-primary">
                      <MapPin className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{a.label}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {a.detail} · {a.area}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="card-soft p-6">
              <h2 className="font-display text-lg font-bold text-primary">Métodos de pagamento</h2>
              <div className="mt-4 space-y-2">
                {paymentMethods.slice(0, 3).map((m) => (
                  <div
                    key={m.id}
                    className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-xl border border-border p-3"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface text-primary">
                      <CreditCard className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{m.label}</p>
                      <p className="truncate text-xs text-muted-foreground">{m.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </PageShell>
  );
}