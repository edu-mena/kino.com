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
import { Switch } from "@/components/ui/switch";
import { INITIAL_SAVED_ADDRESSES } from "@/data/mockData";
import { useAddresses } from "@/lib/addresses";
import { useAuth } from "@/lib/auth";
import { usePreferences } from "@/lib/preferences";
import { useTranslation } from "@/i18n";

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
    labelKey: "perfil.menuPreferencesLabel",
    descriptionKey: "perfil.menuPreferencesDescription",
    icon: Settings,
    to: "/preferencias" as const,
  },
  {
    labelKey: "perfil.menuOrdersLabel",
    descriptionKey: "perfil.menuOrdersDescription",
    icon: Receipt,
    to: "/entrega" as const,
  },
  {
    labelKey: "perfil.menuReservationsLabel",
    descriptionKey: "perfil.menuReservationsDescription",
    icon: CalendarCheck,
    to: "/reservas" as const,
  },
  {
    labelKey: "perfil.menuFavoritesLabel",
    descriptionKey: "perfil.menuFavoritesDescription",
    icon: Heart,
    to: "/favoritos" as const,
  },
] as const;

const notificationOptions = [
  { key: "orderUpdates", labelKey: "perfil.notifOrderUpdatesLabel", descriptionKey: "perfil.notifOrderUpdatesDescription" },
  { key: "promotions", labelKey: "perfil.notifPromotionsLabel", descriptionKey: "perfil.notifPromotionsDescription" },
  { key: "news", labelKey: "perfil.notifNewsLabel", descriptionKey: "perfil.notifNewsDescription" },
] as const;

function Perfil() {
  // Todos os hooks ficam aqui em cima, incondicionalmente — o early return
  // de "não autorizado" logo abaixo não pode vir antes de nenhum deles
  // (regra dos hooks; um deles depois do return já causava "Rendered more
  // hooks than during the previous render" entre o render de SSR sem user
  // e a hidratação no cliente com user).
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { language, setLanguage, notificationSettings, setNotificationSetting } = usePreferences();
  const { customAddresses, addAddress } = useAddresses();
  const [addAddressOpen, setAddAddressOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
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
    toast.success(t("perfil.addressAdded"));
    setNewAlias("");
    setNewAddress("");
    setAddAddressOpen(false);
  };

  if (!user) {
    return (
      <PageShell>
        <div className="mx-auto max-w-6xl px-4 py-20 text-center">
          <h1 className="text-3xl font-bold text-primary">{t("perfil.unauthorizedTitle")}</h1>
          <p className="mt-2 text-muted-foreground">{t("perfil.unauthorizedDescription")}</p>
          <Link
            to="/entrar"
            className="mt-6 inline-flex rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground"
          >
            {t("perfil.goToLogin")}
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
            {menu.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="group grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4 text-left transition-colors hover:bg-surface"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface text-primary transition-transform group-hover:scale-110">
                  <item.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{t(item.labelKey)}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {t(item.descriptionKey)}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            ))}

            <Dialog open={notificationsOpen} onOpenChange={setNotificationsOpen}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="group grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4 text-left transition-colors hover:bg-surface"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface text-primary transition-transform group-hover:scale-110">
                    <Bell className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{t("perfil.notificationsLabel")}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {t("perfil.notificationsDescription")}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-sm rounded-[1.5rem] border-none bg-card p-6">
                <DialogTitle className="font-display text-lg font-bold">{t("perfil.notificationsLabel")}</DialogTitle>
                <DialogDescription>{t("perfil.notificationsDialogDescription")}</DialogDescription>
                <div className="mt-2 space-y-4">
                  {notificationOptions.map((opt) => (
                    <div key={opt.key} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{t(opt.labelKey)}</p>
                        <p className="truncate text-xs text-muted-foreground">{t(opt.descriptionKey)}</p>
                      </div>
                      <Switch
                        checked={notificationSettings[opt.key]}
                        onCheckedChange={(checked) => setNotificationSetting(opt.key, checked)}
                      />
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>

            <button
              type="button"
              onClick={handleLogout}
              className="group grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-3 p-4 text-left text-destructive transition-colors hover:bg-destructive/5"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-destructive/10 transition-transform group-hover:scale-110">
                <LogOut className="h-4 w-4" />
              </span>
              <span className="text-sm font-semibold">{t("perfil.logout")}</span>
            </button>
          </div>

          <div className="space-y-6">
            <section className="card-soft p-6">
              <h2 className="font-display text-lg font-bold text-primary">{t("perfil.savedAddresses")}</h2>
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
                    {t("perfil.addAddress")}
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-sm rounded-[1.5rem] border-none bg-card p-6">
                  <DialogTitle className="font-display text-lg font-bold">
                    {t("perfil.newAddressTitle")}
                  </DialogTitle>
                  <DialogDescription>{t("perfil.newAddressDescription")}</DialogDescription>
                  <form onSubmit={handleAddAddress} className="mt-2 space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="address-alias">{t("perfil.aliasLabel")}</Label>
                      <Input
                        id="address-alias"
                        value={newAlias}
                        onChange={(e) => setNewAlias(e.target.value)}
                        placeholder={t("perfil.aliasPlaceholder")}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="address-line">{t("perfil.addressLabel")}</Label>
                      <Input
                        id="address-line"
                        value={newAddress}
                        onChange={(e) => setNewAddress(e.target.value)}
                        placeholder={t("perfil.addressPlaceholder")}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full rounded-xl">
                      {t("perfil.saveAddress")}
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
