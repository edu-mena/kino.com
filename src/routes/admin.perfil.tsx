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
  Play,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Star,
  Store,
  Trash2,
  Utensils,
  Wallet,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { RestaurantGate } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { ImageCropper } from "@/components/image-cropper";
import { ImageUploadField } from "@/components/image-upload-field";
import { LocationMap, LocationPicker } from "@/components/location-map";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { VideoTrimmer } from "@/components/video-trimmer";
import { WeeklyHoursEditor } from "@/components/weekly-hours-editor";
import { getRestaurantFulfillmentModes, getRestaurantPaymentMethodIds } from "@/data/helpers";
import { deriveRestaurantCoords } from "@/data/restaurant-coordinates";
import { saveProfileEdits } from "@/data/restaurant-profile-store";
import type { FulfillmentType, WeeklyHours } from "@/data/types";
import { useTranslation } from "@/i18n";
import { formatKz } from "@/lib/format";
import { paymentMethods } from "@/lib/mock-data";
import { CROP_PRESETS } from "@/lib/image-crop-presets";
import { getVideoDurationSec } from "@/lib/image-upload";
import { isVideoSrc } from "@/lib/video-trim";
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
  const [trimFile, setTrimFile] = useState<File | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);

  const addFromDevice = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.type.startsWith("video/")) {
      setBusy(true);
      try {
        if ((await getVideoDurationSec(file)) < 2.9) {
          toast.error(t("videoTrimmer.tooShort", { min: 3 }));
          return;
        }
      } catch {
        toast.error(t("adminPerfil.uploadError"));
        return;
      } finally {
        setBusy(false);
      }
      setTrimFile(file);
      return;
    }
    // Imagem → editor de corte (rácio de galeria).
    setCropFile(file);
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
              {!src.trim() ? (
                <span className="grid h-full w-full place-items-center text-muted-foreground">
                  <ImagePlus className="h-5 w-5" />
                </span>
              ) : isVideoSrc(src) ? (
                <>
                  <video src={src} muted playsInline className="h-full w-full object-cover" />
                  <span className="pointer-events-none absolute inset-0 grid place-items-center">
                    <Play className="h-6 w-6 fill-white/90 text-white/90 drop-shadow" />
                  </span>
                </>
              ) : (
                <img src={src} alt="" className="h-full w-full object-cover" />
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

      <VideoTrimmer
        file={trimFile}
        open={trimFile !== null}
        onOpenChange={(o) => !o && setTrimFile(null)}
        onConfirm={(r) => {
          onChange([...items, r.src]);
          setTrimFile(null);
        }}
      />

      <ImageCropper
        file={cropFile}
        open={cropFile !== null}
        onOpenChange={(o) => !o && setCropFile(null)}
        aspect={CROP_PRESETS.gallery.aspect}
        maxDimension={CROP_PRESETS.gallery.maxDimension}
        hint={t(CROP_PRESETS.gallery.hintKey)}
        onConfirm={(dataUrl) => {
          onChange([...items, dataUrl]);
          setCropFile(null);
        }}
      />

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
          accept="image/*,video/*"
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

      <p className="text-xs text-muted-foreground">{t("adminPerfil.galleryVideoHint")}</p>

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
  const [address, setAddress] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: -8.839,
    lng: 13.2894,
  });
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [hours, setHours] = useState<WeeklyHours>(defaultWeeklyHours);
  const [ordersPaused, setOrdersPaused] = useState(false);
  const [isDeliveryAvailable, setIsDeliveryAvailable] = useState(false);
  const [modeTakeaway, setModeTakeaway] = useState(true);
  const [modeDinein, setModeDinein] = useState(true);
  const [deliveryFee, setDeliveryFee] = useState("0");
  const [estimatedDeliveryMinutes, setEstimatedDeliveryMinutes] = useState("30");
  const [deliveryZones, setDeliveryZones] = useState<string[]>([]);
  const [acceptedPay, setAcceptedPay] = useState<string[]>([]);
  const [cautionAmount, setCautionAmount] = useState("0");
  const [cautionPolicyNotice, setCautionPolicyNotice] = useState("");
  const [cautionModes, setCautionModes] = useState<FulfillmentType[]>([]);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [imageUploading, setImageUploading] = useState(false);

  const seedFromRestaurant = () => {
    if (!restaurant) return;
    setCoverImage(restaurant.coverImage);
    setDescription(restaurant.description);
    setCuisine(restaurant.cuisine);
    setAddress(restaurant.address);
    setNeighborhood(restaurant.neighborhood);
    setCity(restaurant.city);
    setCoords(
      restaurant.lat != null && restaurant.lng != null
        ? { lat: restaurant.lat, lng: restaurant.lng }
        : deriveRestaurantCoords(restaurant.id, restaurant.neighborhood),
    );
    setPhone(restaurant.phone);
    setEmail(restaurant.email);
    setHours(restaurant.hours ?? defaultWeeklyHours());
    setOrdersPaused(restaurant.ordersPausedManually ?? false);
    setIsDeliveryAvailable(restaurant.isDeliveryAvailable);
    const modes = getRestaurantFulfillmentModes(restaurant);
    setModeTakeaway(modes.includes("takeaway"));
    setModeDinein(modes.includes("dinein"));
    setDeliveryFee(String(restaurant.deliveryFee));
    setEstimatedDeliveryMinutes(String(restaurant.estimatedDeliveryMinutes));
    setDeliveryZones(restaurant.deliveryZones ?? []);
    setAcceptedPay(getRestaurantPaymentMethodIds(restaurant));
    setCautionAmount(String(restaurant.cautionAmount));
    setCautionPolicyNotice(restaurant.cautionPolicyNotice);
    setCautionModes(restaurant.cautionModesForOrders ?? []);
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
    const fulfillmentModes: FulfillmentType[] = [
      ...(isDeliveryAvailable ? (["delivery"] as const) : []),
      ...(modeTakeaway ? (["takeaway"] as const) : []),
      ...(modeDinein ? (["dinein"] as const) : []),
    ];
    const cautionOn = Number(cautionAmount) > 0;
    const ok = saveProfileEdits(restaurant.id, {
      coverImage: coverImage.trim() || restaurant.coverImage,
      description: description.trim(),
      cuisine: cuisine.trim(),
      address: address.trim(),
      neighborhood: neighborhood.trim(),
      city: city.trim(),
      lat: coords.lat,
      lng: coords.lng,
      phone: phone.trim(),
      email: email.trim(),
      openingHours: "",
      hours,
      ordersPausedManually: ordersPaused,
      isDeliveryAvailable,
      fulfillmentModes,
      acceptedPaymentMethods: acceptedPay.length === paymentMethods.length ? [] : acceptedPay,
      deliveryFee: Number(deliveryFee) || 0,
      estimatedDeliveryMinutes: Number(estimatedDeliveryMinutes) || 0,
      deliveryZones: deliveryZones.map((z) => z.trim()).filter(Boolean),
      cautionAmount: Number(cautionAmount) || 0,
      cautionPolicyNotice: cautionPolicyNotice.trim(),
      cautionModesForOrders: cautionOn ? cautionModes : [],
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
  const heroPrice = restaurant.priceLevel;
  const heroDelivery = editing ? isDeliveryAvailable : restaurant.isDeliveryAvailable;
  const heroCover = editing ? coverImage || restaurant.coverImage : restaurant.coverImage;
  const na = t("adminPerfil.notProvided");

  return (
    <div className="pb-16">
      <div className="mx-auto mt-8 max-w-[1792px] space-y-6 px-4 md:px-6">
        {/* ---------- Cartão do restaurante ---------- */}
        <div className="card-soft overflow-hidden">
          <div className="relative h-64 sm:h-80 lg:h-[26rem]">
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

        {!editing && (
          <div className="flex justify-end">
            <Button type="button" onClick={startEditing} className="rounded-xl">
              <Pencil className="h-4 w-4" /> {t("adminPerfil.editProfile")}
            </Button>
          </div>
        )}

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
                  crop="cover"
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
                    <Label>{t("adminPerfil.priceLevelLabel")}</Label>
                    <div className="flex h-9 items-center rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-foreground">
                      {restaurant.priceLevel}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("adminPerfil.priceLevelAuto")}
                    </p>
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

                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <Label>{t("adminPerfil.mapLabel")}</Label>
                    <button
                      type="button"
                      onClick={() =>
                        setCoords(deriveRestaurantCoords(restaurant.id, neighborhood.trim()))
                      }
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      {t("adminPerfil.useProvinceCenter")}
                    </button>
                  </div>
                  <LocationPicker value={coords} onChange={setCoords} height={280} />
                  <p className="text-xs text-muted-foreground">
                    {t("adminPerfil.mapPickHint")} · {coords.lat.toFixed(5)},{" "}
                    {coords.lng.toFixed(5)}
                  </p>
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
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {t("adminPerfil.modesLabel")}
                </p>
                <div className="flex items-center justify-between gap-3 rounded-xl bg-surface p-4">
                  <div className="flex items-center gap-2">
                    <Bike className="h-4 w-4 shrink-0 text-primary" />
                    <div>
                      <Label htmlFor="rest-delivery">{t("fulfillment.delivery")}</Label>
                      <p className="text-xs text-muted-foreground">
                        {t("adminPerfil.deliveryOffHint")}
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="rest-delivery"
                    checked={isDeliveryAvailable}
                    onCheckedChange={setIsDeliveryAvailable}
                  />
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl bg-surface p-4">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 shrink-0 text-primary" />
                    <Label htmlFor="rest-takeaway">{t("fulfillment.takeaway")}</Label>
                  </div>
                  <Switch
                    id="rest-takeaway"
                    checked={modeTakeaway}
                    onCheckedChange={setModeTakeaway}
                  />
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl bg-surface p-4">
                  <div className="flex items-center gap-2">
                    <Utensils className="h-4 w-4 shrink-0 text-primary" />
                    <Label htmlFor="rest-dinein">{t("fulfillment.dinein")}</Label>
                  </div>
                  <Switch id="rest-dinein" checked={modeDinein} onCheckedChange={setModeDinein} />
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
              icon={Wallet}
              title={t("adminPerfil.secPaymentsTitle")}
              hint={t("adminPerfil.secPaymentsHint")}
            >
              <div className="space-y-2">
                {paymentMethods.map((m) => {
                  const on = acceptedPay.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() =>
                        setAcceptedPay((prev) =>
                          prev.includes(m.id) ? prev.filter((x) => x !== m.id) : [...prev, m.id],
                        )
                      }
                      aria-pressed={on}
                      className={`grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border p-3 text-left ${
                        on ? "border-brand bg-brand/5" : "border-border"
                      }`}
                    >
                      <span className="grid h-8 w-14 shrink-0 place-items-center rounded-lg bg-surface text-[10px] font-bold text-primary">
                        {m.brand}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold">{m.label}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {m.detail}
                        </span>
                      </span>
                      <Switch checked={on} tabIndex={-1} className="pointer-events-none" />
                    </button>
                  );
                })}
                <p className="text-xs text-muted-foreground">
                  {t("adminPerfil.paymentsExplainer")}
                </p>
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
                  <>
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
                    <div className="space-y-2">
                      <Label>{t("adminPerfil.cautionModesLabel")}</Label>
                      <div className="flex flex-wrap gap-2">
                        {(["delivery", "takeaway", "dinein"] as const).map((m) => {
                          const on = cautionModes.includes(m);
                          return (
                            <button
                              key={m}
                              type="button"
                              onClick={() =>
                                setCautionModes((prev) =>
                                  prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m],
                                )
                              }
                              aria-pressed={on}
                              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                                on
                                  ? "border-brand bg-brand/10 text-brand"
                                  : "border-border text-muted-foreground hover:border-primary/40"
                              }`}
                            >
                              {t(`fulfillment.${m}`)}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t("adminPerfil.cautionModesExplainer")}
                      </p>
                    </div>
                  </>
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
                    <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                      {t("adminPerfil.priceLevelAuto")}
                    </span>
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
              {restaurant.lat != null && restaurant.lng != null && (
                <div className="mt-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {t("adminPerfil.mapReadLabel")}
                  </p>
                  <LocationMap
                    className="mt-2"
                    height={200}
                    points={[
                      {
                        id: restaurant.id,
                        lat: restaurant.lat,
                        lng: restaurant.lng,
                        label: restaurant.name,
                      },
                    ]}
                  />
                </div>
              )}
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
              <div className="mb-4">
                <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {t("adminPerfil.modesLabel")}
                </dt>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {getRestaurantFulfillmentModes(restaurant).map((m) => (
                    <span
                      key={m}
                      className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-foreground"
                    >
                      {t(`fulfillment.${m}`)}
                    </span>
                  ))}
                </div>
              </div>
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
              icon={Wallet}
              title={t("adminPerfil.secPaymentsTitle")}
              hint={t("adminPerfil.secPaymentsHint")}
            >
              {(() => {
                const ids = getRestaurantPaymentMethodIds(restaurant);
                const all = ids.length === paymentMethods.length;
                return all ? (
                  <p className="text-sm text-muted-foreground">{t("adminPerfil.paymentsAll")}</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {ids.map((id) => (
                      <span
                        key={id}
                        className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-foreground"
                      >
                        {paymentMethods.find((m) => m.id === id)?.label ?? id}
                      </span>
                    ))}
                  </div>
                );
              })()}
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
                  <div className="pt-1">
                    <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      {t("adminPerfil.cautionModesLabel")}
                    </dt>
                    <p className="mt-1 text-sm text-foreground">
                      {restaurant.cautionModesForOrders?.length
                        ? restaurant.cautionModesForOrders
                            .map((m) => t(`fulfillment.${m}`))
                            .join(" · ")
                        : t("adminPerfil.cautionModesNone")}
                    </p>
                  </div>
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
                      {isVideoSrc(src) ? (
                        <video
                          src={src}
                          controls
                          playsInline
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <img src={src} alt="" className="h-full w-full object-cover" />
                      )}
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
