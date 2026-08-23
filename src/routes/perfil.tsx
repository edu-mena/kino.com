import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  CalendarCheck,
  ChevronRight,
  Heart,
  LogOut,
  MapPin,
  Plus,
  Receipt,
  Settings,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import icon from "@/assets/icon.png";
import { PageShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INITIAL_SAVED_ADDRESSES } from "@/data/mockData";
import { useAddresses } from "@/lib/addresses";
import { useAuth } from "@/lib/auth";
import { usePreferences } from "@/lib/preferences";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Meu perfil — Kino.com" },
      {
        name: "description",
        content: "Gerencie os seus dados, endereços guardados e histórico de pedidos no Kino.com.",
      },
      { property: "og:title", content: "Meu perfil — Kino.com" },
      { property: "og:description", content: "Endereços e histórico de pedidos." },
    ],
  }),
  component: Perfil,
});

const languages = [
  { value: "pt", label: "Português" },
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
];

const menu = [
  {
    label: "Preferências",
    description: "Ingredientes favoritos e ingredientes a evitar nos seus pedidos.",
    icon: Settings,
    to: "/preferencias" as const,
  },
  {
    label: "Histórico de pedidos",
    description: "Veja o estado e o histórico dos seus pedidos anteriores.",
    icon: Receipt,
    to: "/acompanhar" as const,
  },
  {
    label: "Reservas",
    description: "Acompanhe e agende reservas de mesa nos restaurantes.",
    icon: CalendarCheck,
    to: "/reservas" as const,
  },
  {
    label: "Favoritos",
    description: "Os restaurantes que guardou como favoritos.",
    icon: Heart,
    to: "/favoritos" as const,
  },
  {
    label: "Notificações",
    description: "Ajuste alertas de pedidos, promoções e novidades.",
    icon: Bell,
    to: undefined,
  },
];

function Perfil() {
  // Todos os hooks ficam aqui em cima, incondicionalmente — o early return
  // de "não autorizado" logo abaixo não pode vir antes de nenhum deles
  // (regra dos hooks; um deles depois do return já causava "Rendered more
  // hooks than during the previous render" entre o render de SSR sem user
  // e a hidratação no cliente com user).
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { language, setLanguage } = usePreferences();
  const { customAddresses, addAddress } = useAddresses();
  const [addAddressOpen, setAddAddressOpen] = useState(false);
  const [newAlias, setNewAlias] = useState("");
  const [newAddress, setNewAddress] = useState("");

  const handleLogout = () => {
    logout();
    navigate({ to: "/entrar" });
  };

  const handleAddAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlias.trim() || !newAddress.trim()) return;
    addAddress(newAlias.trim(), newAddress.trim());
    toast.success("Endereço adicionado");
    setNewAlias("");
    setNewAddress("");
    setAddAddressOpen(false);
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
  const allAddresses = [...INITIAL_SAVED_ADDRESSES, ...customAddresses];

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 pt-10 md:px-6">
        <div className="card-soft grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 p-6">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-primary font-display text-xl font-extrabold text-primary-foreground">
            {initials}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-extrabold text-primary">{user.name}</h1>
            <p className="truncate text-sm text-muted-foreground">
              {user.email} · {user.phone}
            </p>
          </div>
          <div className="shrink-0">
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-36 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="card-soft divide-y divide-border">
            {menu.map((item) =>
              item.to ? (
                <Link
                  key={item.label}
                  to={item.to}
                  className="group grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4 text-left transition-colors hover:bg-surface"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface text-primary transition-transform group-hover:scale-110">
                    <item.icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{item.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </Link>
              ) : (
                <button
                  key={item.label}
                  type="button"
                  className="group grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4 text-left transition-colors hover:bg-surface"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface text-primary transition-transform group-hover:scale-110">
                    <item.icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{item.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </button>
              ),
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="group grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-3 p-4 text-left text-destructive transition-colors hover:bg-destructive/5"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-destructive/10 transition-transform group-hover:scale-110">
                <LogOut className="h-4 w-4" />
              </span>
              <span className="text-sm font-semibold">Terminar sessão</span>
            </button>
          </div>

          <div className="space-y-6">
            <section className="card-soft p-6">
              <h2 className="font-display text-lg font-bold text-primary">Endereços guardados</h2>
              <div className="mt-4 space-y-2">
                {allAddresses.map((a) => (
                  <div
                    key={a.id}
                    className="group grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:border-primary hover:bg-surface"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface text-primary transition-transform group-hover:scale-110">
                      <MapPin className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{a.label}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {a.line1}
                        {a.line2 ? ` · ${a.line2}` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <Dialog open={addAddressOpen} onOpenChange={setAddAddressOpen}>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm font-semibold text-primary transition-colors hover:border-primary hover:bg-primary/5"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar novo endereço
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-sm rounded-[1.5rem] border-none bg-card p-6">
                  <DialogTitle className="font-display text-lg font-bold">
                    Novo endereço
                  </DialogTitle>
                  <DialogDescription>
                    Dê um apelido fácil de reconhecer e o endereço completo.
                  </DialogDescription>
                  <form onSubmit={handleAddAddress} className="mt-2 space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="address-alias">Alias</Label>
                      <Input
                        id="address-alias"
                        value={newAlias}
                        onChange={(e) => setNewAlias(e.target.value)}
                        placeholder="Ex: Casa, Trabalho..."
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="address-line">Endereço</Label>
                      <Input
                        id="address-line"
                        value={newAddress}
                        onChange={(e) => setNewAddress(e.target.value)}
                        placeholder="Rua, número, bairro..."
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full rounded-xl">
                      Guardar endereço
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </section>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
