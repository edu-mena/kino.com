import { Check, Loader2, MapPin, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LocationPicker } from "@/components/location-map";
import { useTranslation } from "@/i18n";
import { useLocation } from "@/lib/location";
import { getMapsClient } from "@/lib/maps";

type Point = { lat: number; lng: number };

/**
 * Botão "usar a minha localização atual" — pede a localização exata do
 * dispositivo (`useLocation().requestDeviceLocation`, já usado em
 * `restaurantes.tsx` para ordenar por proximidade, nunca antes para criar
 * uma morada) e, assim que resolve, mostra o `LocationPicker` (mapa
 * arrastável, já usado no cadastro de restaurante/parceiro) centrado nesse
 * ponto — o cliente pode ajustar o pino antes de confirmar. Usa
 * `getMapsClient().reverseGeocode` (já implementado nos dois provedores —
 * local e Google — mas sem nenhum consumidor até agora) para sugerir o
 * texto da morada; sem backend de mapas real configurado, essa sugestão é
 * só o nome da província mais próxima — aproximada de propósito, nunca
 * fingindo ser uma morada exata que a app não tem como saber.
 */
export function UseCurrentLocationField({
  onConfirm,
  onCancel,
}: {
  onConfirm: (result: { lat: number; lng: number; line1: string; province?: string }) => void;
  onCancel?: () => void;
}) {
  const { t } = useTranslation();
  const { deviceCoords, deviceLocationStatus, requestDeviceLocation } = useLocation();
  const [point, setPoint] = useState<Point | null>(null);
  const [addressPreview, setAddressPreview] = useState("");
  const [province, setProvince] = useState<string | undefined>(undefined);
  const [geocoding, setGeocoding] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runReverseGeocode = (p: Point) => {
    setGeocoding(true);
    getMapsClient()
      .reverseGeocode(p)
      .then((result) => {
        setAddressPreview(result?.formattedAddress ?? "");
        setProvince(result?.province);
      })
      .catch(() => {
        setAddressPreview("");
        setProvince(undefined);
      })
      .finally(() => setGeocoding(false));
  };

  // Assim que a localização do dispositivo resolve pela primeira vez,
  // centra o pino lá e já sugere a morada — sem precisar de um segundo
  // clique.
  useEffect(() => {
    if (deviceLocationStatus === "granted" && deviceCoords && !point) {
      const next = { lat: deviceCoords[0], lng: deviceCoords[1] };
      setPoint(next);
      runReverseGeocode(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceLocationStatus, deviceCoords]);

  const handlePointChange = (next: Point) => {
    setPoint(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runReverseGeocode(next), 500);
  };

  if (!point) {
    return (
      <button
        type="button"
        onClick={requestDeviceLocation}
        disabled={deviceLocationStatus === "loading"}
        className="flex w-full items-center gap-2.5 rounded-xl border border-dashed border-brand/40 bg-brand/5 px-4 py-3 text-left transition-colors hover:border-brand disabled:opacity-70"
      >
        {deviceLocationStatus === "loading" ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand" />
        ) : (
          <MapPin className="h-4 w-4 shrink-0 text-brand" />
        )}
        <span className="min-w-0 flex-1 text-xs font-semibold text-brand">
          {deviceLocationStatus === "loading"
            ? t("useLocation.loading")
            : deviceLocationStatus === "denied"
              ? t("useLocation.denied")
              : deviceLocationStatus === "unsupported"
                ? t("useLocation.unsupported")
                : t("useLocation.cta")}
        </span>
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-border p-3">
      <LocationPicker value={point} onChange={handlePointChange} height={180} />
      <p className="text-xs text-muted-foreground">
        {geocoding ? t("useLocation.geocoding") : addressPreview || t("useLocation.noAddress")}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setPoint(null);
            onCancel?.();
          }}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
        >
          <X className="h-3.5 w-3.5" />
          {t("common.cancel")}
        </button>
        <button
          type="button"
          onClick={() =>
            onConfirm({
              lat: point.lat,
              lng: point.lng,
              line1: addressPreview,
              ...(province ? { province } : {}),
            })
          }
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-xs font-bold text-brand-foreground transition-opacity hover:opacity-90"
        >
          <Check className="h-3.5 w-3.5" />
          {t("useLocation.confirm")}
        </button>
      </div>
    </div>
  );
}
