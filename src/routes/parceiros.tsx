import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, ImagePlus, Lock, Mail, MapPin, Phone, Store } from "lucide-react";
import { useState, type FormEvent } from "react";
import icon from "@/assets/icon.png";
import { Logo } from "@/components/logo";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/i18n";

export const Route = createFileRoute("/parceiros")({
  head: () => ({
    meta: [
      { title: "Torne-se parceiro — Kino.com" },
      {
        name: "description",
        content:
          "Leve o seu restaurante para a Kino: cardápio digital, QR Code, mesas e clientes num só lugar.",
      },
      { property: "og:title", content: "Torne-se parceiro — Kino.com" },
      { property: "og:image", content: icon },
    ],
  }),
  component: Parceiros,
});

const inputClass =
  "w-full min-w-0 rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary";

const inputWithIconClass = `${inputClass} pl-11`;

const PARTNERS_EMAIL = "parceiros@kino.com";

function Parceiros() {
  const { t } = useTranslation();

  const categories = [
    { value: "angolana", label: t("parceiros.categoryAngolan") },
    { value: "burgers", label: t("parceiros.categoryBurgers") },
    { value: "pizza", label: t("parceiros.categoryPizza") },
    { value: "sobremesas", label: t("parceiros.categoryDesserts") },
    { value: "outra", label: t("parceiros.categoryOther") },
  ];

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState("");

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setPasswordError(true);
      return;
    }
    setPasswordError(false);

    // Sem backend, o "cadastro" não tem para onde ir de verdade — em vez de
    // fingir que o pedido foi recebido, abrimos também o email real para a
    // equipa de parceiros (nunca a password, que fica só no formulário).
    const data = new FormData(e.currentTarget);
    const name = String(data.get("restaurantName") ?? "");
    const categoryValue = String(data.get("category") ?? "");
    const categoryLabel = categories.find((c) => c.value === categoryValue)?.label ?? "";
    const phone = String(data.get("phone") ?? "");
    const address = String(data.get("address") ?? "");
    const about = String(data.get("about") ?? "");
    const body = [
      `Restaurante: ${name}`,
      `Categoria: ${categoryLabel}`,
      `Email: ${email}`,
      `Telefone: ${phone}`,
      `Morada: ${address}`,
      about ? `\nSobre o restaurante:\n${about}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    const mailto = `mailto:${PARTNERS_EMAIL}?subject=${encodeURIComponent(
      `Novo pedido de parceria — ${name}`,
    )}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;

    setSubmitted(true);
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-5 py-12 sm:px-12">
      <div className="w-full max-w-3xl">
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> {t("parceiros.backHome")}
          </Link>
          <Link to="/admin/entrar" className="text-sm font-semibold text-primary hover:underline">
            {t("parceiros.alreadyPartner")}
          </Link>
        </div>

        <div className="mx-auto mt-8 flex max-w-md flex-col items-center text-center">
          <Logo />
          <h1 className="mt-6 text-3xl font-extrabold text-primary">{t("parceiros.title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("parceiros.description")}</p>
        </div>

        <section className="mt-10">
          <form
            onSubmit={handleSubmit}
            className="rounded-[2rem] border border-border bg-card p-6 sm:p-10"
          >
            {/* Photo upload */}
            <label className="mx-auto flex h-32 w-32 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-full border-2 border-dashed border-border bg-background text-center transition-colors hover:border-primary">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt={t("parceiros.photoAlt")}
                  className="h-full w-full object-cover"
                />
              ) : (
                <>
                  <ImagePlus className="h-6 w-6 text-muted-foreground" />
                  <span className="px-2 text-[11px] font-medium text-muted-foreground">
                    {t("parceiros.photoPlaceholder")}
                  </span>
                </>
              )}
              <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
            </label>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="relative">
                <Store className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  required
                  name="restaurantName"
                  placeholder={t("parceiros.restaurantNamePlaceholder")}
                  className={inputWithIconClass}
                />
              </div>

              <Select required name="category">
                <SelectTrigger className="h-auto rounded-xl border-border bg-background px-4 py-3 text-sm text-foreground focus:ring-1 focus:ring-primary">
                  <SelectValue placeholder={t("parceiros.categoryPlaceholder")} />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border p-2 shadow-lg">
                  {categories.map((c) => (
                    <SelectItem
                      key={c.value}
                      value={c.value}
                      className="rounded-lg py-2.5 pl-3 focus:bg-surface focus:text-foreground"
                    >
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative sm:col-span-2">
                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  required
                  type="email"
                  placeholder={t("parceiros.emailPlaceholder")}
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputWithIconClass}
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  required
                  type="password"
                  placeholder={t("parceiros.passwordPlaceholder")}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputWithIconClass}
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  required
                  type="password"
                  placeholder={t("parceiros.confirmPasswordPlaceholder")}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputWithIconClass}
                />
              </div>
              {passwordError && (
                <p className="-mt-2 text-xs font-medium text-destructive sm:col-span-2">
                  {t("parceiros.passwordMismatchError")}
                </p>
              )}

              <div className="relative">
                <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  required
                  name="phone"
                  type="tel"
                  placeholder={t("parceiros.phonePlaceholder")}
                  autoComplete="tel"
                  className={inputWithIconClass}
                />
              </div>

              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  required
                  name="address"
                  placeholder={t("parceiros.addressPlaceholder")}
                  className={inputWithIconClass}
                />
              </div>

              <textarea
                name="about"
                placeholder={t("parceiros.aboutPlaceholder")}
                rows={4}
                className={`${inputClass} resize-none sm:col-span-2`}
              />
            </div>

            <button
              type="submit"
              className="mt-6 w-full rounded-full bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
            >
              {t("parceiros.submit")}
            </button>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              {t("parceiros.submitHint")}
            </p>
          </form>
        </section>

        <Dialog open={submitted} onOpenChange={setSubmitted}>
          <DialogContent className="max-w-sm rounded-[2rem] border-none bg-card p-8 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
              <CheckCircle2 className="h-7 w-7" />
            </span>
            <DialogTitle className="mt-4 font-display text-xl font-bold text-primary">
              {t("parceiros.dialogTitle")}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {t("parceiros.dialogDescriptionPrefix")} {PARTNERS_EMAIL}{" "}
              {t("parceiros.dialogDescriptionMiddle")}
              {email ? (
                <>
                  {" "}
                  {t("parceiros.dialogDescriptionOpenedFrom")}{" "}
                  <strong className="text-foreground">{email}</strong>)
                </>
              ) : (
                ""
              )}
              . {t("parceiros.dialogDescriptionSuffix")}
            </DialogDescription>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
