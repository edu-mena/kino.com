import { Search, X } from "lucide-react";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getProvinces } from "@/data/helpers";
import { INITIAL_USER_PROFILE } from "@/data/mockData";

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
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="rounded-xl">
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

/** Caixa de busca de ingrediente com recomendação dinâmica (sugestões a
 * cada caractere) — mesmo padrão do popup de busca do header. */
export function IngredientSearchFilter({
  value,
  onChange,
  allIngredientNames,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  allIngredientNames: string[];
}) {
  const [query, setQuery] = useState(value ?? "");

  const suggestions =
    query && !value
      ? allIngredientNames.filter((n) => n.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
      : [];

  const select = (name: string) => {
    onChange(name);
    setQuery(name);
  };

  const clear = () => {
    onChange(null);
    setQuery("");
  };

  return (
    <div className="relative min-w-0">
      <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 transition-colors has-[:focus]:border-primary">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (value) onChange(null);
          }}
          placeholder="Pesquisar ingrediente..."
          className="w-full min-w-0 bg-transparent text-sm outline-none"
        />
        {value && (
          <button type="button" onClick={clear} aria-label="Remover ingrediente">
            <X className="h-4 w-4 shrink-0 text-muted-foreground hover:text-destructive" />
          </button>
        )}
      </div>
      {suggestions.length > 0 && (
        <div className="absolute inset-x-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-lg">
          {suggestions.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => select(name)}
              className="block w-full truncate rounded-lg px-3 py-2 text-left text-sm hover:bg-surface"
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
