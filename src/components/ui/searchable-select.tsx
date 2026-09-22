import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type SearchableSelectOption = { value: string; label: string };

/**
 * Combobox pesquisável com opção de entrada personalizada — a mesma lógica
 * de "escolher de uma lista predefinida, ou escrever o próprio" que antes
 * cada página reinventava à sua maneira (ex: `isPresetCategory`/
 * `CUSTOM_CATEGORY` em dish-form-dialog.tsx, só pra categoria de prato).
 * Construído sobre `cmdk` (`@/components/ui/command`), já instalado mas
 * nunca usado em lado nenhum antes disto.
 *
 * Serve tanto listas pequenas (ex: tipo de restaurante, ~5 opções) como
 * grandes (ex: lista de ingredientes do cardápio, ~200) — a pesquisa é
 * sempre a mesma interação, só passa a ser útil de facto quando a lista
 * cresce; não há motivo pra ter dois componentes diferentes consoante o
 * tamanho da lista.
 */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyText,
  customLabel,
  className,
  id,
}: {
  options: SearchableSelectOption[];
  /** Pode ser um `value` de `options` OU um texto livre já escolhido antes
   * (ex: candidatura antiga com um tipo de restaurante personalizado). */
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  /** Mostrado quando a pesquisa não bate com nada E `customLabel` não foi dado. */
  emptyText: string;
  /** Presente = mostra "usar “{query}”" quando a pesquisa não bate com
   * nenhuma opção, permitindo guardar esse texto livre como valor. Omitido
   * = lista fechada, sem entrada personalizada. */
  customLabel?: ((query: string) => string) | undefined;
  className?: string;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((o) => o.value === value);
  const displayLabel = selected?.label ?? value;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-auto w-full justify-between rounded-xl border-border bg-background px-4 py-3 text-sm font-normal hover:bg-background",
            !displayLabel && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">{displayLabel || placeholder}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) rounded-xl border-border p-0 shadow-lg"
        align="start"
      >
        <Command>
          <CommandInput value={query} onValueChange={setQuery} placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty className="px-2 py-2">
              {customLabel && query.trim() ? (
                <button
                  type="button"
                  onClick={() => {
                    onChange(query.trim());
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-accent"
                >
                  <Plus className="h-4 w-4 shrink-0" /> {customLabel(query.trim())}
                </button>
              ) : (
                <span className="block py-2 text-center text-muted-foreground">{emptyText}</span>
              )}
            </CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.value}
                  value={o.label}
                  onSelect={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className="rounded-lg py-2 pl-3"
                >
                  <Check
                    className={cn("h-4 w-4", value === o.value ? "opacity-100" : "opacity-0")}
                  />
                  {o.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
