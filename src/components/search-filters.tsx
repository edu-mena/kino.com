import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getProvinces } from "@/data/helpers";
import { useTranslation } from "@/i18n";

const provinces = getProvinces();
export const MY_AREA = "minha-area";

/** Select de localização reutilizado nos filtros de busca — "A minha
 * localização" (província do usuário, `INITIAL_USER_PROFILE.userNeighborhood`)
 * vem sempre primeiro, seguido de "Todas as províncias" e da lista completa. */
export function LocationFilterSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="rounded-xl" aria-label={t("common.location")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={MY_AREA}>A minha localização</SelectItem>
        <SelectItem value="todos">Todas as províncias</SelectItem>
        {provinces.map((n) => (
          <SelectItem key={n} value={n}>
            {n}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** `myProvince` é a província real da morada selecionada pelo utilizador
 * (ver `addressProvince` em @/data/helpers) — sem morada selecionada,
 * "A minha localização" não filtra nada em vez de comparar com um valor
 * fictício. */
export function matchesLocation(
  restaurantNeighborhood: string | undefined,
  filterValue: string,
  myProvince?: string,
) {
  if (filterValue === "todos") return true;
  if (filterValue === MY_AREA) return !myProvince || restaurantNeighborhood === myProvince;
  return restaurantNeighborhood === filterValue;
}
