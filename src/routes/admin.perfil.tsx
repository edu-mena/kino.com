import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Bike,
  Clock,
  ExternalLink,
  Images,
  ImagePlus,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  ShieldCheck,
  Star,
  Store,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { AdminPageHeading, RestaurantGate } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { ImageUploadField } from "@/components/image-upload-field";
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
import { Textarea } from "@/components/ui/textarea";
import { WeeklyHoursEditor } from "@/components/weekly-hours-editor";
import { saveProfileEdits } from "@/data/restaurant-profile-store";
import type { WeeklyHours } from "@/data/types";
import { useTranslation } from "@/i18n";
import { formatKz } from "@/lib/format";
import { fileToResizedDataUrl } from "@/lib/image-upload";
import { defaultWeeklyHours, formatWeeklyHours, isOpenNow, nextOpenAt } from "@/lib/opening-hours";
import { useRestaurantAdmin } from "@/lib/restaurant-admin";

export const Route = createFileRoute("/admin/perfil")({
  head: () => ({ meta: [{ title: "Restaurante — Painel Kino.com" }] }),
  component: () => (
    <RestaurantGate>
      <AdminPerfil />
    </RestaurantGate>
  ),
});

/** Bloco com cabeçalho (ícone + título + descrição) e conteúdo num cartão. */
function Section({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: typeof Store;
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <section className="card-soft p-5 sm:p-6">
      <div className="flex items-start gap-3 border-b border-border pb-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-base font-bold text-foreground">{title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** Par rótulo/valor para o modo de leitura. */
function ReadRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-foreground">{children}</dd>
    </div>
  );
}

/** Galeria editável — mostra a imagem de cada entrada, não só o link. */
function GalleryEditor({
  items,
  onChange,
}: {
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const addFromDevice = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      onChange([...items, await fileToResizedDataUrl(file)]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("adminPerfil.uploadError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {items.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((src, index) => (
            <div
              key={index}
              className="group relative aspect-video overflow-hidden rounded-xl border border-border bg-surface"
            >
              {src.trim() ? (
                <img src={src} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="grid h-full w-full place-items-center text-muted-foreground">
                  <ImagePlus className="h-5 w-5" />
                </span>
              )}
              <button
                type="button"
                aria-label={t("textListField.removeAria")}
                onClick={() => onChange(items.filter((_, i) => i !== index))}
                className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-lg bg-black/55 text-white transition-colors hover:bg-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onChange([...items, ""])}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary"
        >
          <Plus className="h-3.5 w-3.5" /> {t("adminPerfil.galleryAddUrl")}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={addFromDevice}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary disabled:opacity-50"
        >
          <ImagePlus className="h-3.5 w-3.5" /> {t("adminPerfil.uploadFromDevice")}
        </button>
      </div>

      {items.some((s) => !s.startsWith("data:")) && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{t("adminPerfil.galleryUrlHint")}</p>
          {items.map((value, index) =>
            value.startsWith("data:") ? null : (
              <Input
                key={index}
                value={value}
                onChange={(e) => onChange(items.map((v, i) => (i === index ? e.target.value : v)))}
                placeholder={t("adminPerfil.galleryPlaceholder")}
                className="min-w-0"
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}

function AdminPerfil() {
  const { restaurant, logout } = useRestaurantAdmin();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [editing, setEditing] = useState(false);

  const [coverImage, setCoverImage] = useState("");
  const [description, setDescription] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [priceLevel, setPriceLevel] = useState("Kz Kz");
  const [address, setAddress] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [hours, setHours] = useState<WeeklyHours>(defaultWeeklyHours);
  const [ordersPaused, setOrdersPaused] = useState(false);
  const [isDeliveryAvailable, setIsDeliveryAvailable] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState("0");
  const [estimatedDeliveryMinutes, setEstimatedDeliveryMinutes] = useState("30");
  const [deliveryZones, setDeliveryZones] = useState<string[]>([]);
  const [cautionAmount, setCautionAmount] = useState("0");
  const [cautionPolicyNotice, setCautionPolicyNotice] = useState("");
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [imageUploading, setImageUploading] = useState(false);

  const seedFromRestaurant = () => {
    if (!restaurant) return;
    setCoverImage(restaurant.coverImage);
    setDescription(restaurant.description);
    setCuisine(restaurant.cuisine);
    setPriceLevel(restaurant.priceLevel);
    setAddress(restaurant.address);
    setNeighborhood(restaurant.neighborhood);
    setCity(restaurant.city);
    setPhone(restaurant.phone);
    setEmail(restaurant.email);
    setHours(restaurant.hours ?? defaultWeeklyHours());
    setOrdersPaused(restaurant.ordersPausedManually ?? false);
    setIsDeliveryAvailable(restaurant.isDeliveryAvailable);
    setDeliveryFee(String(restaurant.deliveryFee));
    setEstimatedDeliveryMinutes(String(restaurant.estimatedDeliveryMinutes));
    setDeliveryZones(restaurant.deliveryZones ?? []);
    setCautionAmount(String(restaurant.cautionAmount));
    setCautionPolicyNotice(restaurant.cautionPolicyNotice);
    setGalleryImages(restaurant.galleryImages);
  };

  // Reabastece o formulário quando o restaurante gerido muda e sai do modo
  // de edição (troca de sessão não deve manter um formulário meio preenchido).
  useEffect(() => {
    seedFromRestaurant();
    setEditing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant]);

  if (!restaurant) return null;

  const handleLogout = () => {
    logout();
    navigate({ to: "/admin/entrar" });
  };

  const startEditing = () => {
    seedFromRestaurant();
    setEditing(true);
  };

  const cancelEditing = () => {
    seedFromRestaurant();
    setEditing(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = saveProfileEdits(restaurant.id, {
      coverImage: coverImage.trim() || restaurant.coverImage,
      description: description.trim(),
      cuisine: cuisine.trim(),
      priceLevel,
      address: address.trim(),
      neighborhood: neighborhood.trim(),
      city: city.trim(),
      phone: phone.trim(),
      email: email.trim(),
      openingHours: "",
      hours,
      ordersPausedManually: ordersPaused,
      isDeliveryAvailable,
      deliveryFee: Number(deliveryFee) || 0,
      estimatedDeliveryMinutes: Number(estimatedDeliveryMinutes) || 0,
      deliveryZones: deliveryZones.map((z) => z.trim()).filter(Boolean),
      cautionAmount: Number(cautionAmount) || 0,
      cautionPolicyNotice: cautionPolicyNotice.trim(),
      galleryImages: galleryImages.map((g) => g.trim()).filter(Boolean),
    });
    if (!ok) {
      toast.error(t("adminPerfil.saveFailedError"));
      return;
    }
    toast.success(t("adminPerfil.updatedToast"));
    setEditing(false);
  };

  const heroCuisine = editing ? cuisine : restaurant.cuisine;
  const heroPrice = editing ? priceLevel : restaurant.priceLevel;
  const heroDelivery = editing ? isDeliveryAvailable : restaurant.isDeliveryAvailable;
  const heroCover = editing ? coverImage || restaurant.coverImage : restaurant.coverImage;
  const na = t("adminPerfil.notProvided");

  return (
    <div className="pb-16">
      <AdminPageHeading
        eyebrow={t("adminPerfil.eyebrow")}
        title={t("adminPerfil.title")}
        description={t("adminPerfil.description")}
        action={
          !editing ? (
            <Button type="button" onClick={startEditing} className="rounded-xl">
              <Pencil className="h-4 w-4" /> {t("adminPerfil.editProfile")}
            </Button>
          ) : undefined
        }
      />

      <div className="mx-auto mt-8 max-w-4xl space-y-6 px-4 md:px-6">
        {/* ---------- Cartão do restaurante ---------- */}
        <div className="card-soft overflow-hidden">
          <div className="relative h-48">
            <img src={heroCover} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <Link
              to="/restaurantes/$id"
              params={{ id: restaurant.id }}
              className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-white"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {t("adminPerfil.viewPublicPage")}
            </Link>
            <div className="absolute inset-x-0 bottom-0 p-5">
              <h2 className="font-display text-2xl font-extrabold text-white">{restaurant.name}</h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs font-semibold">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-white backdrop-blur">
                  <Star className="h-3 w-3 fill-star text-star" />
                  {restaurant.rating.toFixed(1)} · {restaurant.reviewCount}{" "}
                  {t("adminPerfil.ratingSuffix")}
                </span>
                {heroCuisine && (
                  <span className="rounded-full bg-white/15 px-2 py-0.5 text-white backdrop-blur">
                    {heroCuisine}
                  </span>
                )}
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-white backdrop-blur">
                  {heroPrice}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 backdrop-blur ${
                    heroDelivery ? "bg-success/80 text-white" : "bg-white/15 text-white"
                  }`}
                >
                  {heroDelivery
                    ? t("adminPerfil.deliveryOnChip")
                    : t("adminPerfil.deliveryOffChip")}
                </span>
              </div>
            </div>
          </div>
          <p className="flex flex-wrap gap-1 p-5 text-xs text-muted-foreground">
            <span>{t("adminPerfil.manageNoticePrefix")}</span>
            <Link to="/admin/suporte" className="font-semibold text-primary hover:underline">
              {t("adminPerfil.contactSupport")}
            </Link>
            <span>{t("adminPerfil.manageNoticeSuffix")}</span>
          </p>
        </div>

        {editing ? (
          /* ========================= MODO DE EDIÇÃO ========================= */
          <form onSubmit={handleSubmit} className="space-y-6">
            <Section
              icon={Store}
              title={t("adminPerfil.secIdentityTitle")}
              hint={t("adminPerfil.secIdentityHint")}
            >
              <div className="space-y-5">
                <ImageUploadField
                  value={coverImage}
                  onChange={setCoverImage}
                  onUploadingChange={setImageUploading}
                  label={t("adminPerfil.coverImageLabel")}
                />
                <div className="space-y-1.5">
                  <Label htmlFor="rest-description">{t("adminPerfil.descriptionLabel")}</Label>
                  <Textarea
                    id="rest-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="rest-cuisine">{t("adminPerfil.cuisineLabel")}</Label>
                    <Input
                      id="rest-cuisine"
                      value={cuisine}
                      onChange={(e) => setCuisine(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rest-price-level">{t("adminPerfil.priceLevelLabel")}</Label>
                    <Select value={priceLevel} onValueChange={setPriceLevel}>
                      <SelectTrigger id="rest-price-level" className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Kz">{t("adminPerfil.priceLevelLow")}</SelectItem>
                        <SelectItem value="Kz Kz">{t("adminPerfil.priceLevelMid")}</SelectItem>
                        <SelectItem value="Kz Kz Kz">{t("adminPerfil.priceLevelHigh")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </Section>

            <Section
              icon={MapPin}
              title={t("adminPerfil.secLocationTitle")}
              hint={t("adminPerfil.secLocationHint")}
            >
              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="rest-address">{t("adminPerfil.addressLabel")}</Label>
                    <Input
                      id="rest-address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rest-neighborhood">{t("adminPerfil.neighborhoodLabel")}</Label>
                    <Input
                      id="rest-neighborhood"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="rest-city">{t("adminPerfil.cityLabel")}</Label>
                    <Input id="rest-city" value={city} onChange={(e) => setCity(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rest-phone">{t("adminPerfil.phoneLabel")}</Label>
                    <Input
                      id="rest-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rest-email">{t("adminPerfil.emailLabel")}</Label>
                    <Input
                      id="rest-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </Section>

            <Section
              icon={Clock}
              title={t("adminPerfil.secHoursTitle")}
              hint={t("adminPerfil.secHoursHint")}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 rounded-xl bg-surface p-4">
                  <div>
                    <Label>{t("adminPerfil.pauseOrdersLabel")}</Label>
                    <p className="text-xs text-muted-foreground">
                      {t("adminPerfil.pauseOrdersHint")}
                    </p>
                  </div>
                  <Switch checked={ordersPaused} onCheckedChange={setOrdersPaused} />
                </div>
                <WeeklyHoursEditor value={hours} onChange={setHours} />
              </div>
            </Section>

            <Section
              icon={Bike}
              title={t("adminPerfil.secDeliveryTitle")}
              hint={t("adminPerfil.secDeliveryHint")}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 rounded-xl bg-surface p-4">
                  <div>
                    <Label htmlFor="rest-delivery">{t("adminPerfil.deliveryLabel")}</Label>
                    <p className="text-xs text-muted-foreground">
                      {t("adminPerfil.deliveryOffHint")}
                    </p>
                  </div>
                  <Switch
                    id="rest-delivery"
                    checked={isDeliveryAvailable}
                    onCheckedChange={setIsDeliveryAvailable}
                  />
                </div>
                {isDeliveryAvailable && (
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="rest-delivery-fee">
                          {t("adminPerfil.deliveryFeeLabel")}
                        </Label>
                        <Input
                          id="rest-delivery-fee"
                          type="number"
                          min={0}
                          step={50}
                          value={deliveryFee}
                          onChange={(e) => setDeliveryFee(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="rest-delivery-time">
                          {t("adminPerfil.deliveryTimeLabel")}
                        </Label>
                        <Input
                          id="rest-delivery-time"
                          type="number"
                          min={5}
                          value={estimatedDeliveryMinutes}
                          onChange={(e) => setEstimatedDeliveryMinutes(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>{t("adminPerfil.deliveryZonesLabel")}</Label>
                        <button
                          type="button"
                          onClick={() => setDeliveryZones([...deliveryZones, ""])}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-brand"
                        >
                          <Plus className="h-3.5 w-3.5" /> {t("textListField.add")}
                        </button>
                      </div>
                      {deliveryZones.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-border px-3 py-2.5 text-xs text-muted-foreground">
                          {t("adminPerfil.deliveryZonePlaceholder")}
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {deliveryZones.map((value, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <Input
                                value={value}
                                onChange={(e) =>
                                  setDeliveryZones(
                                    deliveryZones.map((v, i) => (i === index ? e.target.value : v)),
                                  )
                                }
                                placeholder={t("adminPerfil.deliveryZonePlaceholder")}
                                className="min-w-0"
                              />
                              <button
                                type="button"
                                aria-label={t("textListField.removeAria")}
                                onClick={() =>
                                  setDeliveryZones(deliveryZones.filter((_, i) => i !== index))
                                }
                                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {t("adminPerfil.deliveryZonesExplainer")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Section>

            <Section
              icon={ShieldCheck}
              title={t("adminPerfil.secCautionTitle")}
              hint={t("adminPerfil.secCautionHint")}
            >
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">{t("adminPerfil.cautionExplainer")}</p>
                <div className="space-y-1.5">
                  <Label htmlFor="rest-caution">{t("adminPerfil.cautionLabel")}</Label>
                  <Input
                    id="rest-caution"
                    type="number"
                    min={0}
                    step={500}
                    value={cautionAmount}
                    onChange={(e) => setCautionAmount(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {Number(cautionAmount) > 0
                      ? t("adminPerfil.cautionChargedHint", {
                          value: formatKz(Number(cautionAmount) || 0),
                        })
                      : t("adminPerfil.cautionZeroHint")}
                  </p>
                </div>
                {Number(cautionAmount) > 0 && (
                  <div className="space-y-1.5">
                    <Label htmlFor="rest-caution-policy">
                      {t("adminPerfil.cautionPolicyLabel")}
                    </Label>
                    <Textarea
                      id="rest-caution-policy"
                      value={cautionPolicyNotice}
                      onChange={(e) => setCautionPolicyNotice(e.target.value)}
                      placeholder={t("adminPerfil.cautionPolicyPlaceholder")}
                      className="rounded-xl"
                    />
                  </div>
                )}
              </div>
            </Section>

            <Section
              icon={Images}
              title={t("adminPerfil.secGalleryTitle")}
              hint={t("adminPerfil.secGalleryHint")}
            >
              <GalleryEditor items={galleryImages} onChange={setGalleryImages} />
            </Section>

            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={cancelEditing}
                className="rounded-xl"
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={imageUploading} className="rounded-xl px-6">
                {t("adminPerfil.saveChanges")}
              </Button>
            </div>
          </form>
        ) : (
          /* ========================= MODO DE LEITURA ========================= */
          <div className="space-y-6">
            <Section
              icon={Store}
              title={t("adminPerfil.secIdentityTitle")}
              hint={t("adminPerfil.secIdentityHint")}
            >
              <div className="space-y-4">
                <p className="text-sm leading-relaxed text-foreground">
                  {restaurant.description || <span className="text-muted-foreground">{na}</span>}
                </p>
                <dl className="grid gap-4 sm:grid-cols-2">
                  <ReadRow label={t("adminPerfil.cuisineLabel")}>
                    {restaurant.cuisine || na}
                  </ReadRow>
                  <ReadRow label={t("adminPerfil.priceLevelLabel")}>
                    {restaurant.priceLevel}
                  </ReadRow>
                </dl>
              </div>
            </Section>

            <Section
              icon={MapPin}
              title={t("adminPerfil.secLocationTitle")}
              hint={t("adminPerfil.secLocationHint")}
            >
              <dl className="grid gap-4 sm:grid-cols-2">
                <ReadRow label={t("adminPerfil.addressLabel")}>{restaurant.address || na}</ReadRow>
                <ReadRow label={t("adminPerfil.neighborhoodLabel")}>
                  {restaurant.neighborhood || na}
                </ReadRow>
                <ReadRow label={t("adminPerfil.cityLabel")}>{restaurant.city || na}</ReadRow>
                <ReadRow label={t("adminPerfil.phoneLabel")}>
                  {restaurant.phone ? (
                    <a
                      href={`tel:${restaurant.phone.replace(/\s/g, "")}`}
                      className="inline-flex items-center gap-1.5 hover:text-primary"
                    >
                      <Phone className="h-3.5 w-3.5 text-primary" />
                      {restaurant.phone}
                    </a>
                  ) : (
                    na
                  )}
                </ReadRow>
                <ReadRow label={t("adminPerfil.emailLabel")}>
                  {restaurant.email ? (
                    <a
                      href={`mailto:${restaurant.email}`}
                      className="inline-flex items-center gap-1.5 hover:text-primary"
                    >
                      <Mail className="h-3.5 w-3.5 text-primary" />
                      <span className="truncate">{restaurant.email}</span>
                    </a>
                  ) : (
                    na
                  )}
                </ReadRow>
              </dl>
            </Section>

            <Section
              icon={Clock}
              title={t("adminPerfil.secHoursTitle")}
              hint={t("adminPerfil.secHoursHint")}
            >
              <div className="space-y-2">
                {(() => {
                  const open = restaurant.hours ? isOpenNow(restaurant.hours) : true;
                  const paused = restaurant.ordersPausedManually;
                  return (
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        paused
                          ? "bg-destructive/15 text-destructive"
                          : open
                            ? "bg-success/15 text-success"
                            : "bg-muted-foreground/15 text-muted-foreground"
                      }`}
                    >
                      {paused
                        ? t("adminPerfil.stateOrdersPaused")
                        : open
                          ? t("adminPerfil.stateOpenNow")
                          : t("adminPerfil.stateClosedNow", {
                              opensAt: restaurant.hours
                                ? (nextOpenAt(restaurant.hours, "pt") ?? "")
                                : "",
                            })}
                    </span>
                  );
                })()}
                <p className="text-sm text-foreground">
                  {restaurant.hours
                    ? formatWeeklyHours(restaurant.hours, "pt")
                    : restaurant.openingHours || na}
                </p>
              </div>
            </Section>

            <Section
              icon={Bike}
              title={t("adminPerfil.secDeliveryTitle")}
              hint={t("adminPerfil.secDeliveryHint")}
            >
              {restaurant.isDeliveryAvailable ? (
                <div className="space-y-4">
                  <dl className="grid gap-4 sm:grid-cols-2">
                    <ReadRow label={t("adminPerfil.deliveryFeeLabel")}>
                      {formatKz(restaurant.deliveryFee)}
                    </ReadRow>
                    <ReadRow label={t("adminPerfil.deliveryTimeLabel")}>
                      {t("adminPerfil.minutesValue", { min: restaurant.estimatedDeliveryMinutes })}
                    </ReadRow>
                  </dl>
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      {t("adminPerfil.deliveryZonesLabel")}
                    </dt>
                    {restaurant.deliveryZones && restaurant.deliveryZones.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {restaurant.deliveryZones.map((zone) => (
                          <span
                            key={zone}
                            className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-foreground"
                          >
                            {zone}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t("adminPerfil.deliveryAllProvince")}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("adminPerfil.deliveryLocalOnly")}
                </p>
              )}
            </Section>

            <Section
              icon={ShieldCheck}
              title={t("adminPerfil.secCautionTitle")}
              hint={t("adminPerfil.secCautionHint")}
            >
              {restaurant.cautionAmount > 0 ? (
                <div className="space-y-2">
                  <p className="font-display text-2xl font-extrabold text-primary">
                    {formatKz(restaurant.cautionAmount)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {restaurant.cautionPolicyNotice || t("adminPerfil.cautionNoPolicy")}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t("adminPerfil.cautionNone")}</p>
              )}
            </Section>

            <Section
              icon={Images}
              title={t("adminPerfil.secGalleryTitle")}
              hint={t("adminPerfil.secGalleryHint")}
            >
              {restaurant.galleryImages.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {restaurant.galleryImages.map((src, i) => (
                    <div
                      key={i}
                      className="aspect-video overflow-hidden rounded-xl border border-border bg-surface"
                    >
                      <img src={src} alt="" className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t("adminPerfil.galleryEmpty")}</p>
              )}
            </Section>
          </div>
        )}

        <button
          type="button"
          onClick={handleLogout}
          className="mx-auto block rounded-xl border border-dashed border-border px-5 py-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
        >
          {t("adminPerfil.logout")}
        </button>
      </div>
    </div>
  );
}
