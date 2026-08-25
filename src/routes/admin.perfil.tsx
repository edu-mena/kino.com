import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminPageHeading } from "@/components/admin-shell";
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
import { getProfileEdits, saveProfileEdits } from "@/data/restaurant-profile-store";
import { formatKz } from "@/lib/format";
import { useRestaurantAdmin } from "@/lib/restaurant-admin";

export const Route = createFileRoute("/admin/perfil")({
  head: () => ({ meta: [{ title: "Restaurante — Painel Kino.com" }] }),
  component: AdminPerfil,
});

/** Lista simples de texto (bairros de entrega, imagens da galeria) — cada
 * linha um `Input`, com adicionar/remover, mesmo padrão dos ingredientes
 * em `dish-form-dialog.tsx`. */
function TextListField({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <button
          type="button"
          onClick={() => onChange([...items, ""])}
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand"
        >
          <Plus className="h-3.5 w-3.5" /> Adicionar
        </button>
      </div>
      <div className="space-y-2">
        {items.map((value, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              value={value}
              onChange={(e) => onChange(items.map((v, i) => (i === index ? e.target.value : v)))}
              placeholder={placeholder}
              className="min-w-0"
            />
            <button
              type="button"
              aria-label="Remover"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminPerfil() {
  const { restaurant, logout } = useRestaurantAdmin();
  const navigate = useNavigate();

  const [coverImage, setCoverImage] = useState("");
  const [description, setDescription] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [priceLevel, setPriceLevel] = useState("Kz Kz");
  const [address, setAddress] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [openingHours, setOpeningHours] = useState("");
  const [isDeliveryAvailable, setIsDeliveryAvailable] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState("0");
  const [estimatedDeliveryMinutes, setEstimatedDeliveryMinutes] = useState("30");
  const [deliveryZones, setDeliveryZones] = useState<string[]>([]);
  const [cautionAmount, setCautionAmount] = useState("0");
  const [cautionPolicyNotice, setCautionPolicyNotice] = useState("");
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [imageUploading, setImageUploading] = useState(false);

  // Reabastece o formulário sempre que o restaurante gerido muda (troca de
  // sessão) — combina o seed com edições já guardadas, exatamente como
  // `getRestaurant()` faz para o resto da app.
  useEffect(() => {
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
    setOpeningHours(restaurant.openingHours);
    setIsDeliveryAvailable(restaurant.isDeliveryAvailable);
    setDeliveryFee(String(restaurant.deliveryFee));
    setEstimatedDeliveryMinutes(String(restaurant.estimatedDeliveryMinutes));
    setDeliveryZones(restaurant.deliveryZones ?? []);
    setCautionAmount(String(restaurant.cautionAmount));
    setCautionPolicyNotice(restaurant.cautionPolicyNotice);
    setGalleryImages(restaurant.galleryImages);
  }, [restaurant]);

  if (!restaurant) return null;

  const handleLogout = () => {
    logout();
    navigate({ to: "/admin/entrar" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveProfileEdits(restaurant.id, {
      coverImage: coverImage.trim() || restaurant.coverImage,
      description: description.trim(),
      cuisine: cuisine.trim(),
      priceLevel,
      address: address.trim(),
      neighborhood: neighborhood.trim(),
      city: city.trim(),
      phone: phone.trim(),
      email: email.trim(),
      openingHours: openingHours.trim(),
      isDeliveryAvailable,
      deliveryFee: Number(deliveryFee) || 0,
      estimatedDeliveryMinutes: Number(estimatedDeliveryMinutes) || 0,
      deliveryZones: deliveryZones.map((z) => z.trim()).filter(Boolean),
      cautionAmount: Number(cautionAmount) || 0,
      cautionPolicyNotice: cautionPolicyNotice.trim(),
      galleryImages: galleryImages.map((g) => g.trim()).filter(Boolean),
    });
    toast.success("Perfil atualizado.");
  };

  return (
    <div className="pb-16">
      <AdminPageHeading
        eyebrow="Restaurante"
        title="Perfil do restaurante"
        description="O que os clientes veem na sua página e no cardápio."
      />

      <div className="mx-auto mt-8 max-w-4xl space-y-6 px-4 md:px-6">
        <div className="card-soft overflow-hidden">
          <div className="relative h-40">
            <img
              src={coverImage || restaurant.coverImage}
              alt=""
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5">
              <h2 className="font-display text-2xl font-extrabold text-white">{restaurant.name}</h2>
              <p className="flex items-center gap-1 text-sm text-white/90">
                {restaurant.rating.toFixed(1)} ({restaurant.reviewCount} avaliações)
              </p>
            </div>
          </div>
          <p className="p-5 pb-4 text-xs text-muted-foreground">
            Nome, avaliação e destaque na app são geridos pela Kino —{" "}
            <Link to="/admin/suporte" className="font-semibold text-primary hover:underline">
              contacte o suporte
            </Link>{" "}
            para alterar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card-soft space-y-5 p-5">
          <ImageUploadField
            value={coverImage}
            onChange={setCoverImage}
            onUploadingChange={setImageUploading}
            label="Imagem de capa"
          />

          <div className="space-y-1.5">
            <Label htmlFor="rest-description">Descrição</Label>
            <Textarea
              id="rest-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rest-cuisine">Tipo de cozinha</Label>
              <Input
                id="rest-cuisine"
                value={cuisine}
                onChange={(e) => setCuisine(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rest-price-level">Nível de preço</Label>
              <Select value={priceLevel} onValueChange={setPriceLevel}>
                <SelectTrigger id="rest-price-level" className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Kz">Kz — económico</SelectItem>
                  <SelectItem value="Kz Kz">Kz Kz — médio</SelectItem>
                  <SelectItem value="Kz Kz Kz">Kz Kz Kz — elevado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="rest-address">Morada</Label>
              <Input
                id="rest-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rest-neighborhood">Bairro</Label>
              <Input
                id="rest-neighborhood"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="rest-city">Cidade</Label>
              <Input id="rest-city" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rest-phone">Telefone</Label>
              <Input id="rest-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rest-email">Email</Label>
              <Input
                id="rest-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rest-hours">Horário de funcionamento</Label>
            <Input
              id="rest-hours"
              value={openingHours}
              onChange={(e) => setOpeningHours(e.target.value)}
              placeholder="Ex: Todos os dias, 11h - 22h"
            />
          </div>

          <div className="rounded-xl border border-border p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label htmlFor="rest-delivery">Entrega disponível</Label>
                <p className="text-xs text-muted-foreground">
                  Desligado: o restaurante fica só para consumo no local.
                </p>
              </div>
              <Switch
                id="rest-delivery"
                checked={isDeliveryAvailable}
                onCheckedChange={setIsDeliveryAvailable}
              />
            </div>

            {isDeliveryAvailable && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="rest-delivery-fee">Taxa de entrega (Kz)</Label>
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
                    <Label htmlFor="rest-delivery-time">Tempo estimado (min)</Label>
                    <Input
                      id="rest-delivery-time"
                      type="number"
                      min={5}
                      value={estimatedDeliveryMinutes}
                      onChange={(e) => setEstimatedDeliveryMinutes(e.target.value)}
                    />
                  </div>
                </div>

                <TextListField
                  label="Bairros cobertos pela entrega"
                  items={deliveryZones}
                  onChange={setDeliveryZones}
                  placeholder="Ex: Talatona"
                />
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border p-4">
            <Label htmlFor="rest-caution">Caução de reserva (Kz)</Label>
            <p className="text-xs text-muted-foreground">
              0 = sem caução. {cautionAmount !== "0" && formatKz(Number(cautionAmount) || 0)}
            </p>
            <Input
              id="rest-caution"
              type="number"
              min={0}
              step={500}
              value={cautionAmount}
              onChange={(e) => setCautionAmount(e.target.value)}
              className="mt-2"
            />
            {Number(cautionAmount) > 0 && (
              <Textarea
                value={cautionPolicyNotice}
                onChange={(e) => setCautionPolicyNotice(e.target.value)}
                placeholder="Ex: reembolsada se a mesa for ocupada."
                className="mt-3 rounded-xl"
              />
            )}
          </div>

          <TextListField
            label="Galeria de fotos"
            items={galleryImages}
            onChange={setGalleryImages}
            placeholder="https://..."
          />

          <Button type="submit" disabled={imageUploading} className="w-full rounded-xl">
            Guardar alterações
          </Button>
        </form>

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
