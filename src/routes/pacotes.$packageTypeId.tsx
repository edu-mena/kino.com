import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, MapPin } from "lucide-react";
import { useMemo, useState } from "react";
import { LazyImage } from "@/components/lazy-image";
import { ReservationDialog } from "@/components/reservation-dialog";
import { PageShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { RestaurantPackage } from "@/data/types";
import { usePackageTypeRestaurants } from "@/data/use-package-types-query";
import { useRestaurantDetail } from "@/data/use-restaurants-query";
import { useTranslation } from "@/i18n";
import { personalizedRestaurantDistanceKm } from "@/lib/delivery-eval";
import { formatKz } from "@/lib/format";
import { haversineKm } from "@/lib/geo";
import { useLocation } from "@/lib/location";
import { packageTypeIcon } from "@/lib/package-type-icons";

export const Route = createFileRoute("/pacotes/$packageTypeId")({
  head: () => ({ meta: [{ title: "Pacotes — Luku.com" }] }),
  component: PacotesPorTipo,
});

function PacotesPorTipo() {
  const { packageTypeId } = Route.useParams();
  const { t } = useTranslation();
  const { data: offers = [], isLoading } = usePackageTypeRestaurants(packageTypeId);
  const { selected: selectedAddress, deviceCoords } = useLocation();

  // Detalhe (`selected`) e reserva (`reserving`) são dois passos do MESMO
  // pacote escolhido — nunca dois estados independentes: fechar a reserva
  // (cancelar ou depois de confirmada) limpa os dois juntos.
  const [selected, setSelected] = useState<RestaurantPackage | null>(null);
  const [reserving, setReserving] = useState(false);
  // Busca o restaurante completo assim que o detalhe abre (não só ao
  // clicar "Reservar") — o ReservationDialog precisa de campos que o
  // resumo embutido (`selected.restaurant`) não tem (regras de reserva,
  // aviso de caução...), e assim já está pronto quando o cliente decide.
  const { data: fullRestaurant } = useRestaurantDetail(selected?.restaurant?.id);

  const distanceKm = (p: RestaurantPackage) => {
    if (deviceCoords && p.restaurant?.lat != null && p.restaurant?.lng != null) {
      return Math.round(haversineKm(deviceCoords, [p.restaurant.lat, p.restaurant.lng]) * 10) / 10;
    }
    return p.restaurant ? personalizedRestaurantDistanceKm(p.restaurant.id, selectedAddress, 0) : 0;
  };

  const sorted = useMemo(
    () => [...offers].sort((a, b) => distanceKm(a) - distanceKm(b)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `distanceKm` é recriada a cada render, mas só muda de resultado quando `selectedAddress`/`deviceCoords` mudam.
    [offers, selectedAddress, deviceCoords],
  );

  const typeInfo = sorted[0]?.packageType;
  const Icon = packageTypeIcon(typeInfo?.icon);

  return (
    <PageShell>
      <div className="mx-auto mt-6 max-w-3xl px-4 md:px-6">
        <Link
          to="/pacotes"
          className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> {t("pacotes.backToTypes")}
        </Link>

        {typeInfo && (
          <div className="mt-4 flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-6 w-6" />
            </span>
            <h1 className="font-display text-2xl font-extrabold text-primary sm:text-3xl">
              {typeInfo.name}
            </h1>
          </div>
        )}

        {isLoading ? (
          <p className="card-soft mt-6 p-10 text-center text-sm text-muted-foreground">
            {t("common.loading")}
          </p>
        ) : sorted.length === 0 ? (
          <p className="card-soft mt-6 p-10 text-center text-sm text-muted-foreground">
            {t("pacotes.noRestaurants")}
          </p>
        ) : (
          <div className="mt-6 space-y-3">
            {sorted.map((pkg) => (
              <button
                key={pkg.id}
                type="button"
                onClick={() => setSelected(pkg)}
                className="card-soft flex w-full items-center gap-4 p-4 text-left transition-colors hover:border-brand"
              >
                <LazyImage
                  src={pkg.restaurant?.image ?? ""}
                  alt=""
                  width={112}
                  height={112}
                  widths={[56, 112]}
                  sizes="56px"
                  className="h-14 w-14 shrink-0 rounded-xl bg-surface object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-sm font-bold text-foreground">
                    {pkg.restaurant?.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {pkg.title ?? pkg.packageType.name}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" /> {distanceKm(pkg)} km
                  </p>
                </div>
                <span className="shrink-0 text-sm font-bold text-primary">
                  {formatKz(pkg.price)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selected && !reserving} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-md rounded-[1.5rem] border-none bg-card p-6">
          {selected && (
            <>
              <DialogTitle className="font-display text-lg font-bold">
                {selected.title ?? selected.packageType.name}
              </DialogTitle>
              <DialogDescription>{selected.restaurant?.name}</DialogDescription>
              {selected.description && (
                <p className="mt-3 text-sm text-muted-foreground">{selected.description}</p>
              )}
              <p className="mt-3 text-lg font-bold text-primary">{formatKz(selected.price)}</p>
              {selected.maxPeople != null && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("pacotes.maxPeopleValue", { count: selected.maxPeople })}
                </p>
              )}
              {selected.characteristics.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {selected.characteristics.map((c) => (
                    <span
                      key={c}
                      className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-foreground"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}
              <Button
                type="button"
                className="mt-5 w-full rounded-xl"
                disabled={!fullRestaurant}
                onClick={() => setReserving(true)}
              >
                {t("pacotes.reserve")}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      {selected && fullRestaurant && (
        <ReservationDialog
          restaurant={fullRestaurant}
          restaurantPackage={selected}
          open={reserving}
          onOpenChange={(open) => {
            setReserving(open);
            if (!open) setSelected(null);
          }}
        />
      )}
    </PageShell>
  );
}
