import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getProvinces } from "@/data/helpers";
import { INITIAL_USER_PROFILE } from "@/data/mockData";
import { useTranslation } from "@/i18n";

const provinces = getProvinces();
export const MY_AREA = "minha-area";

/** Select de localização reutilizado nos filtros de busca — "A tua
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
        <SelectItem value={MY_AREA}>A tua localização</SelectItem>
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

export function matchesLocation(restaurantNeighborhood: string | undefined, filterValue: string) {
  if (filterValue === "todos") return true;
  if (filterValue === MY_AREA)
    return restaurantNeighborhood === INITIAL_USER_PROFILE.userNeighborhood;
  return restaurantNeighborhood === filterValue;
}
