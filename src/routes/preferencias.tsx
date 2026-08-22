import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import icon from "@/assets/icon.png";
import { PageHeading, PageShell } from "@/components/site-shell";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getAllIngredientNames } from "@/data/helpers";
import { usePreferences } from "@/lib/preferences";

export const Route = createFileRoute("/preferencias")({
  head: () => ({
    meta: [
      { title: "Preferências — Kino.com" },
      {
        name: "description",
        content: "Ingredientes favoritos e ingredientes que não podem constar no prato.",
      },
      { property: "og:title", content: "Preferências — Kino.com" },
      { property: "og:image", content: icon },
    ],
  }),
  component: Preferencias,
});

function IngredientPicker({
  title,
  description,
  selected,
  onToggle,
  tone,
}: {
  title: string;
  description: string;
  selected: string[];
  onToggle: (name: string) => void;
  tone: "primary" | "destructive";
}) {
  const allIngredients = useMemo(() => getAllIngredientNames(), []);
  const [query, setQuery] = useState("");
  // Ingrediente digitado sem nenhum match no cardápio, aguardando confirmação
  // do usuário antes de ser adicionado como está.
  const [pendingAdd, setPendingAdd] = useState<string | null>(null);

  const trimmedQuery = query.trim();
  const results = trimmedQuery
    ? allIngredients.filter((n) => n.toLowerCase().includes(trimmedQuery.toLowerCase())).slice(0, 40)
    : [];
  const noMatch = trimmedQuery.length > 0 && results.length === 0;

  const addAndClear = (name: string) => {
    onToggle(name);
    setQuery("");
  };

  const chipSelectedClass =
    tone === "primary"
      ? "border-primary bg-primary/10 text-primary"
      : "border-destructive bg-destructive/10 text-destructive";

  return (
    <section className="card-soft p-6">
      <h2 className="font-display text-lg font-bold text-primary">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>

      {selected.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {selected.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => onToggle(name)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${chipSelectedClass}`}
            >
              {name}
              <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}

      <label className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisar ingrediente..."
          className="w-full bg-transparent text-sm outline-none"
        />
      </label>

      {trimmedQuery && (
        <div className="mt-3 flex flex-wrap gap-2">
          {results
            .filter((name) => !selected.includes(name))
            .map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => addAndClear(name)}
                className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary"
              >
                {name}
              </button>
            ))}
          {noMatch && (
            <button
              type="button"
              onClick={() => setPendingAdd(trimmedQuery)}
              className="flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <Plus className="h-3 w-3" />
              Adicionar "{trimmedQuery}"
            </button>
          )}
        </div>
      )}

      <AlertDialog open={pendingAdd !== null} onOpenChange={(open) => !open && setPendingAdd(null)}>
        <AlertDialogContent className="rounded-[1.5rem]">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar ingrediente</AlertDialogTitle>
            <AlertDialogDescription>
              Não encontrámos "{pendingAdd}" no nosso cardápio. Tem a certeza que escreveu o nome
              correto?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingAdd) addAndClear(pendingAdd);
                setPendingAdd(null);
              }}
            >
              Sim, adicionar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function Preferencias() {
  const { favoriteIngredients, toggleFavoriteIngredient, excludedIngredients, toggleExcludedIngredient } =
    usePreferences();

  return (
    <PageShell>
      <PageHeading
        title="Preferências"
        description="Ingredientes favoritos e ingredientes que não podem constar no prato."
      />
      <div className="mx-auto mt-8 max-w-6xl space-y-6 px-4 md:px-6">
        <IngredientPicker
          title="Ingredientes favoritos"
          description="Vamos destacar pratos que tenham estes ingredientes."
          selected={favoriteIngredients}
          onToggle={toggleFavoriteIngredient}
          tone="primary"
        />

        <IngredientPicker
          title="Ingredientes que não podem constar no prato"
          description="Avisamos o restaurante sempre que fizer um pedido com um prato que tenha algum destes ingredientes."
          selected={excludedIngredients}
          onToggle={toggleExcludedIngredient}
          tone="destructive"
        />
      </div>
    </PageShell>
  );
}
