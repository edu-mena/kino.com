import { Navigation } from "lucide-react";
import { useTranslation } from "@/i18n";
import { formatKm, googleDirectionsUrl } from "@/lib/geo";

/**
 * Rodapé do mapa de um só ponto (`enableLocate`): distância até ao
 * utilizador (depois de "a minha localização") e "Como chegar", que abre o
 * Google Maps com a rota real a partir de onde a pessoa está — no telemóvel
 * abre a própria app Google Maps. Link universal: não gasta API nenhuma.
 */
export function MapLocateFooter({
  target,
  distanceKm,
  locateError,
}: {
  target: { lat: number; lng: number };
  distanceKm: number | null;
  locateError: boolean;
}) {
  const { t } = useTranslation();
  return (
    <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      {distanceKm != null && (
        <span className="font-semibold text-foreground">
          {t("locationMap.distanceAway", { km: formatKm(distanceKm) })}
        </span>
      )}
      <a
        href={googleDirectionsUrl(target)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
      >
        <Navigation className="h-3.5 w-3.5" />
        {t("locationMap.directions")}
      </a>
      {locateError && <span className="text-destructive">{t("locationMap.locateError")}</span>}
    </p>
  );
}
