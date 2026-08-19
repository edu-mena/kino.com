import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { getMenuCategories, getRestaurant } from "@/data/helpers";
import { INITIAL_MENU_ITEMS, INITIAL_RESTAURANTS } from "@/data/mockData";
import { formatKz } from "@/lib/format";

const categories = getMenuCategories();
const MAX_PRICE = 20000;
const neighborhoods = [...new Set(INITIAL_RESTAURANTS.map((r) => r.neighborhood))];

export function HeaderSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [maxPrice, setMaxPrice] = useState(MAX_PRICE);
  const [neighborhood, setNeighborhood] = useState<string>("todos");

  const hasActiveFilters = !!query || !!category || maxPrice < MAX_PRICE || neighborhood !== "todos";

  const filtered = useMemo(() => {
    return INITIAL_MENU_ITEMS.filter((item) => {
      const restaurant = getRestaurant(item.restaurantId);
      const byQuery =
        !query ||
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        restaurant?.name.toLowerCase().includes(query.toLowerCase());
      const byCategory = !category || item.category === category;
      const byPrice = item.price <= maxPrice;
      const byNeighborhood = neighborhood === "todos" || restaurant?.neighborhood === neighborhood;
      return byQuery && byCategory && byPrice && byNeighborhood;
    });
  }, [query, category, maxPrice, neighborhood]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:border-primary"
      >
        <Search className="h-4 w-4 shrink-0" />
        Pesquisar pratos, restaurantes, locais...
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl rounded-[2rem] border-none bg-card p-8">
          <DialogTitle className="font-display text-xl font-bold">Buscar</DialogTitle>

          <label className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nome do prato, restaurante..."
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Preço até {formatKz(maxPrice)}
              </p>
              <Slider
                min={0}
                max={MAX_PRICE}
                step={500}
                value={[maxPrice]}
                onValueChange={([v]) => setMaxPrice(v ?? MAX_PRICE)}
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Localização
              </p>
              <Select value={neighborhood} onValueChange={setNeighborhood}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os bairros</SelectItem>
                  {neighborhoods.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Categoria
            </p>
            <ToggleGroup
              type="single"
              value={category ?? ""}
              onValueChange={(v) => setCategory(v || undefined)}
              className="flex-wrap justify-start"
            >
              {categories.map((cat) => (
                <ToggleGroupItem key={cat} value={cat} className="rounded-full border border-border">
                  {cat}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <div className="mt-6 max-h-80 overflow-y-auto">
            {hasActiveFilters ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">{filtered.length} resultados</p>
                {filtered.map((item) => (
                  <SearchResultRow key={item.id} item={item} onSelect={() => setOpen(false)} />
                ))}
                {filtered.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum resultado encontrado.
                  </p>
                )}
              </div>
            ) : (
              <Tabs defaultValue={categories[0] ?? ""}>
                <TabsList className="h-auto flex-wrap justify-start gap-1">
                  {categories.map((cat) => (
                    <TabsTrigger key={cat} value={cat}>
                      {cat}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {categories.map((cat) => (
                  <TabsContent key={cat} value={cat} className="space-y-2">
                    {INITIAL_MENU_ITEMS.filter((item) => item.category === cat).map((item) => (
                      <SearchResultRow key={item.id} item={item} onSelect={() => setOpen(false)} />
                    ))}
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SearchResultRow({
  item,
  onSelect,
}: {
  item: (typeof INITIAL_MENU_ITEMS)[number];
  onSelect: () => void;
}) {
  const restaurant = getRestaurant(item.restaurantId);
  return (
    <Link
      to="/prato/$dishId"
      params={{ dishId: item.id }}
      onClick={onSelect}
      className="flex items-center gap-3 rounded-xl border border-border p-2 transition-colors hover:border-primary"
    >
      <img src={item.image} alt="" className="h-11 w-11 shrink-0 rounded-lg bg-surface object-contain" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{item.name}</p>
        <p className="truncate text-xs text-muted-foreground">{restaurant?.name}</p>
      </div>
      <span className="shrink-0 text-sm font-bold text-primary">{formatKz(item.price)}</span>
    </Link>
  );
}
