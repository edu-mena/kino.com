import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ImagePlus,
  Mail,
  MapPin,
  Phone,
  Store,
  User,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import icon from "@/assets/icon.png";
import { Logo } from "@/components/logo";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { LocationPicker } from "@/components/location-map";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { deriveRestaurantCoords } from "@/data/restaurant-coordinates";
import { apiFetch, ApiError, hasRealBackend } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n";

export const Route = createFileRoute("/parceiros")({
  head: () => ({
    meta: [
      { title: "Torne-se parceiro — Luku.com" },
      {
        name: "description",
        content:
          "Leve o seu restaurante para a Luku: cardápio digital, QR Code, mesas e clientes num só lugar.",
      },
      { property: "og:title", content: "Torne-se parceiro — Luku.com" },
      { property: "og:image", content: icon },
    ],
  }),
  component: Parceiros,
});

const inputClass =
  "w-full min-w-0 rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary";

const inputWithIconClass = `${inputClass} pl-11`;

// As 18 províncias de Angola — não traduzido de propósito (são nomes
// próprios, iguais em pt/en/fr), ao contrário das categorias abaixo.
const ANGOLA_PROVINCES = [
  "Bengo",
  "Benguela",
  "Bié",
  "Cabinda",
  "Cuando Cubango",
  "Cuanza Norte",
  "Cuanza Sul",
  "Cunene",
  "Huambo",
  "Huíla",
  "Luanda",
  "Lunda Norte",
  "Lunda Sul",
  "Malanje",
  "Moxico",
  "Namibe",
  "Uíge",
  "Zaire",
];

type FormState = {
  restaurantName: string;
  category: string;
  ownerName: string;
  email: string;
  phone: string;
  province: string;
  address: string;
  lat: number;
  lng: number;
  about: string;
};

// Luanda — mesmo fallback de LocationPicker/deriveRestaurantCoords noutras
// páginas (admin.perfil.tsx), até o candidato escolher a província.
const DEFAULT_COORDS = { lat: -8.839, lng: 13.2894 };

const EMPTY_FORM: FormState = {
  restaurantName: "",
  category: "",
  ownerName: "",
  email: "",
  phone: "",
  province: "",
  address: "",
  lat: DEFAULT_COORDS.lat,
  lng: DEFAULT_COORDS.lng,
  about: "",
};

function Parceiros() {
  const { t } = useTranslation();

  // Sem "outra" na lista — o SearchableSelect já deixa escrever qualquer
  // categoria que não esteja aqui (ver `customLabel` abaixo), então esse
  // item deixou de fazer sentido como opção fixa (antes escolhê-lo não
  // dava nenhuma forma de escrever qual era a categoria de facto).
  const categories = [
    { value: "angolana", label: t("parceiros.categoryAngolan") },
    { value: "burgers", label: t("parceiros.categoryBurgers") },
    { value: "pizza", label: t("parceiros.categoryPizza") },
    { value: "sobremesas", label: t("parceiros.categoryDesserts") },
  ];

  // Modelo de descrição por categoria — mesmo espírito de
  // `useDishSuggestions`/`applySuggestion` em dish-form-dialog.tsx
  // (preenche automaticamente, mas continua livremente editável depois).
  // Só cobre as 4 categorias predefinidas; uma categoria personalizada não
  // tem modelo (não há como adivinhar o texto certo).
  const descriptionTemplates: Record<string, string> = {
    angolana: t("parceiros.descriptionTemplateAngolana"),
    burgers: t("parceiros.descriptionTemplateBurgers"),
    pizza: t("parceiros.descriptionTemplatePizza"),
    sobremesas: t("parceiros.descriptionTemplateSobremesas"),
  };

  const steps = [
    { key: "restaurant", title: t("parceiros.step1Title") },
    { key: "owner", title: t("parceiros.step2Title") },
    { key: "location", title: t("parceiros.step3Title") },
    { key: "review", title: t("parceiros.step4Title") },
  ] as const;

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showRequiredError, setShowRequiredError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  // false até o candidato mexer no pino do mapa — enquanto isso, escolher a
  // província recentra automaticamente para lá (conveniência); depois de
  // mexido manualmente, a escolha do candidato nunca é sobrescrita sozinha.
  const [locationTouched, setLocationTouched] = useState(false);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const categoryLabel = categories.find((c) => c.value === form.category)?.label ?? form.category;
  const descriptionTemplate = descriptionTemplates[form.category];

  const recenterToProvince = (province: string) => {
    const coords = deriveRestaurantCoords(form.restaurantName || "novo-parceiro", province);
    setForm((prev) => ({ ...prev, lat: coords.lat, lng: coords.lng }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  // Cada passo só avança se os campos obrigatórios DESSE passo estiverem
  // preenchidos — validado manualmente (em vez de `required` nativo do
  // browser) porque só o passo atual está montado no DOM de cada vez.
  const isStepValid = (index: number): boolean => {
    switch (index) {
      case 0:
        return form.restaurantName.trim() !== "" && form.category !== "";
      case 1:
        return form.ownerName.trim() !== "" && form.email.trim() !== "" && form.phone.trim() !== "";
      case 2:
        return form.province !== "" && form.address.trim() !== "";
      default:
        return true;
    }
  };

  const goNext = () => {
    if (!isStepValid(step)) {
      setShowRequiredError(true);
      return;
    }
    setShowRequiredError(false);
    setStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const goBack = () => {
    setShowRequiredError(false);
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Um único <form> para os 4 passos — carregar Enter num <input> de
    // qualquer passo (ex: telefone, morada) dispara este onSubmit mesmo
    // sem o utilizador ter chegado ao botão final, submetendo a
    // candidatura cedo demais (incompleta) sem ele perceber; ao continuar
    // o assistente normalmente a seguir e submeter "a sério" no fim, ficam
    // DUAS candidaturas para a mesma pessoa. Enter só deve avançar de
    // passo, nunca submeter, exceto já no último.
    if (step !== steps.length - 1) {
      goNext();
      return;
    }
    if (!isStepValid(0) || !isStepValid(1) || !isStepValid(2)) {
      // Não deve acontecer (cada passo já bloqueou o avanço), mas se o
      // utilizador chegou aqui por outra via, volta ao primeiro passo com
      // campos em falta em vez de enviar dados incompletos.
      for (let i = 0; i < 3; i++) {
        if (!isStepValid(i)) {
          setStep(i);
          break;
        }
      }
      setShowRequiredError(true);
      return;
    }

    // `StorePartnerApplicationRequest` (backend) não tem campos próprios
    // para categoria/morada/foto — dobrados dentro de `message`, único
    // campo livre que ele aceita, em vez de os perder. `categoryLabel`
    // (definido acima) já cai para o próprio `form.category` quando é uma
    // categoria personalizada (sem isso, "Comida Italiana" digitado à mão
    // desaparecia da mensagem, virando categoria vazia).
    const message = [
      `Categoria: ${categoryLabel}`,
      `Morada: ${form.address}`,
      form.about ? `\n${form.about}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    setSubmitting(true);
    try {
      // Demo sem backend (ver DEPLOY.md) — não há API real para receber o
      // pedido; simula sucesso em vez de rebentar com erro de rede. Nunca
      // acontece em dev/produção real (ver hasRealBackend).
      if (hasRealBackend) {
        // FormData mesmo sem foto (não só quando há uma) — mais simples do
        // que alternar entre JSON e multipart consoante `photoFile`, e o
        // backend aceita os dois formatos da mesma forma para os campos de
        // texto. A foto escolhida no passo 1 ficava só na pré-visualização
        // local antes disto, nunca chegava ao servidor.
        const body = new FormData();
        body.append("restaurant_name", form.restaurantName);
        body.append("owner_name", form.ownerName);
        body.append("email", form.email);
        body.append("phone", form.phone);
        body.append("province", form.province);
        body.append("lat", String(form.lat));
        body.append("lng", String(form.lng));
        body.append("message", message);
        if (photoFile) body.append("photo", photoFile);

        await apiFetch("/partner-applications", { method: "POST", body });
      }
      setSubmitted(true);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t("parceiros.submitError"));
    } finally {
      setSubmitting(false);
    }
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

        {/* Stepper */}
        <div className="mx-auto mt-8 flex max-w-lg items-center">
          {steps.map((s, i) => (
            <div key={s.key} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <span
                  className={cn(
                    "grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors",
                    i < step
                      ? "bg-primary text-primary-foreground"
                      : i === step
                        ? "bg-primary/10 text-primary ring-2 ring-primary"
                        : "bg-surface text-muted-foreground",
                  )}
                >
                  {i < step ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                <span
                  className={cn(
                    "hidden text-center text-[11px] font-semibold sm:block",
                    i === step ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {s.title}
                </span>
              </div>
              {i < steps.length - 1 && (
                <span
                  className={cn(
                    "mx-1.5 h-0.5 flex-1 rounded-full transition-colors sm:-mt-5",
                    i < step ? "bg-primary" : "bg-border",
                  )}
                />
              )}
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-xs font-medium text-muted-foreground sm:hidden">
          {t("parceiros.stepOf", { current: step + 1, total: steps.length })} ·{" "}
          <span className="text-primary">{steps[step]?.title}</span>
        </p>

        <section className="mt-6">
          <form
            onSubmit={handleSubmit}
            className="rounded-[2rem] border border-border bg-card p-6 sm:p-10"
          >
            {step === 0 && (
              <div className="animate-in fade-in slide-in-from-right-2 duration-200">
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
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>

                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <div className="relative sm:col-span-2">
                    <Store className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={form.restaurantName}
                      onChange={(e) => update("restaurantName", e.target.value)}
                      placeholder={t("parceiros.restaurantNamePlaceholder")}
                      className={inputWithIconClass}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <SearchableSelect
                      options={categories}
                      value={form.category}
                      onChange={(v) => update("category", v)}
                      placeholder={t("parceiros.categoryPlaceholder")}
                      searchPlaceholder={t("parceiros.categorySearchPlaceholder")}
                      emptyText={t("parceiros.categoryEmptyText")}
                      customLabel={(query) => t("parceiros.categoryUseCustom", { value: query })}
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="grid gap-4 animate-in fade-in slide-in-from-right-2 duration-200 sm:grid-cols-2">
                <div className="relative sm:col-span-2">
                  <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={form.ownerName}
                    onChange={(e) => update("ownerName", e.target.value)}
                    placeholder={t("parceiros.ownerNamePlaceholder")}
                    className={inputWithIconClass}
                  />
                </div>

                <div className="relative sm:col-span-2">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    placeholder={t("parceiros.emailPlaceholder")}
                    className={inputWithIconClass}
                  />
                </div>

                <div className="relative sm:col-span-2">
                  <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="tel"
                    autoComplete="tel"
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    placeholder={t("parceiros.phonePlaceholder")}
                    className={inputWithIconClass}
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="grid gap-4 animate-in fade-in slide-in-from-right-2 duration-200 sm:grid-cols-2">
                <Select
                  {...(form.province ? { value: form.province } : {})}
                  onValueChange={(v) => {
                    update("province", v);
                    if (!locationTouched) recenterToProvince(v);
                  }}
                >
                  <SelectTrigger className="h-auto rounded-xl border-border bg-background px-4 py-3 text-sm text-foreground focus:ring-1 focus:ring-primary sm:col-span-2">
                    <SelectValue placeholder={t("parceiros.provincePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent className="max-h-64 rounded-2xl border-border p-2 shadow-lg">
                    {ANGOLA_PROVINCES.map((p) => (
                      <SelectItem
                        key={p}
                        value={p}
                        className="rounded-lg py-2.5 pl-3 focus:bg-surface focus:text-foreground"
                      >
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="relative sm:col-span-2">
                  <MapPin className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={form.address}
                    onChange={(e) => update("address", e.target.value)}
                    placeholder={t("parceiros.addressPlaceholder")}
                    className={inputWithIconClass}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {t("adminPerfil.mapLabel")}
                    </span>
                    {form.province && (
                      <button
                        type="button"
                        onClick={() => {
                          recenterToProvince(form.province);
                          setLocationTouched(false);
                        }}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        {t("adminPerfil.useProvinceCenter")}
                      </button>
                    )}
                  </div>
                  <LocationPicker
                    value={{ lat: form.lat, lng: form.lng }}
                    onChange={(next) => {
                      setForm((prev) => ({ ...prev, lat: next.lat, lng: next.lng }));
                      setLocationTouched(true);
                    }}
                    height={240}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("adminPerfil.mapPickHint")} · {form.lat.toFixed(5)}, {form.lng.toFixed(5)}
                  </p>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <textarea
                    value={form.about}
                    onChange={(e) => update("about", e.target.value)}
                    placeholder={t("parceiros.aboutPlaceholder")}
                    rows={4}
                    className={`${inputClass} resize-none`}
                  />
                  {/* Mesma lógica de "preenche mas continua editável" de
                      applySuggestion em dish-form-dialog.tsx — só aparece
                      quando há modelo pra categoria escolhida no passo 1. */}
                  {descriptionTemplate && (
                    <button
                      type="button"
                      onClick={() => update("about", descriptionTemplate)}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      {t("parceiros.useDescriptionTemplate", { category: categoryLabel })}
                    </button>
                  )}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="animate-in fade-in slide-in-from-right-2 duration-200">
                <p className="text-sm text-muted-foreground">{t("parceiros.reviewIntro")}</p>
                <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-border bg-background p-5 sm:flex-row sm:items-center">
                  <span className="mx-auto grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-card sm:mx-0">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt={t("parceiros.photoAlt")}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImagePlus className="h-6 w-6 text-muted-foreground" />
                    )}
                  </span>
                  <div className="min-w-0 text-center sm:text-left">
                    <p className="truncate text-base font-bold text-primary">
                      {form.restaurantName}
                    </p>
                    <p className="text-sm text-muted-foreground">{categoryLabel}</p>
                  </div>
                </div>

                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  <ReviewField icon={User} label={t("parceiros.ownerNamePlaceholder")}>
                    {form.ownerName}
                  </ReviewField>
                  <ReviewField icon={Mail} label={t("parceiros.emailPlaceholder")}>
                    {form.email}
                  </ReviewField>
                  <ReviewField icon={Phone} label={t("parceiros.phonePlaceholder")}>
                    {form.phone}
                  </ReviewField>
                  <ReviewField icon={MapPin} label={t("parceiros.provincePlaceholder")}>
                    {form.province}
                  </ReviewField>
                  <ReviewField icon={MapPin} label={t("parceiros.addressPlaceholder")}>
                    {form.address}
                  </ReviewField>
                  <ReviewField icon={MapPin} label={t("adminPerfil.mapLabel")}>
                    {`${form.lat.toFixed(5)}, ${form.lng.toFixed(5)}`}
                  </ReviewField>
                </dl>

                {form.about && (
                  <p className="mt-4 rounded-xl bg-surface p-4 text-sm text-foreground">
                    {form.about}
                  </p>
                )}
              </div>
            )}

            {showRequiredError && (
              <p className="mt-4 text-center text-xs font-medium text-destructive">
                {t("parceiros.requiredFieldsError")}
              </p>
            )}

            <div className="mt-8 flex items-center gap-3">
              {step > 0 && (
                <button
                  type="button"
                  onClick={goBack}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-5 py-3.5 text-sm font-semibold text-foreground transition-colors hover:border-primary"
                >
                  <ArrowLeft className="h-4 w-4" /> {t("parceiros.back")}
                </button>
              )}
              {step < steps.length - 1 ? (
                <button
                  type="button"
                  onClick={goNext}
                  className="flex flex-1 items-center justify-center gap-1 rounded-full bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  {t("parceiros.next")} <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-full bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {submitting ? t("parceiros.submitting") : t("parceiros.submit")}
                </button>
              )}
            </div>

            {step === steps.length - 1 && (
              <p className="mt-4 text-center text-xs text-muted-foreground">
                {t("parceiros.submitHint")}
              </p>
            )}
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
              {t("parceiros.dialogDescription", { email: form.email })}
            </DialogDescription>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function ReviewField({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof User;
  label: string;
  children: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-background p-3.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <dt className="text-[11px] font-medium text-muted-foreground">{label}</dt>
        <dd className="truncate text-sm font-semibold text-foreground">{children}</dd>
      </div>
    </div>
  );
}
