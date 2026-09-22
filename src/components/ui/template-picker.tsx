import { FileText } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * Lista curada de modelos de texto, escolhidos num popover — ao contrário
 * de `SearchableSelect` (valor único persistente), aqui a escolha só
 * PREENCHE um campo de texto livre com `template.text`; não há "modelo
 * selecionado" que fique guardado, o botão nunca muda de aparência. Mesma
 * ideia de `RESTRICTION_PACKAGES`/`dietary-shortcut-picker.tsx` (lista
 * curada + seleção de um clique), adaptada pra preencher texto em vez de
 * escolher tags.
 */
export function TemplatePicker<T extends { id: string; label: string; text: string }>({
  templates,
  onSelect,
  triggerLabel,
}: {
  templates: T[];
  onSelect: (template: T) => void;
  triggerLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="rounded-lg text-xs">
          <FileText className="h-3.5 w-3.5" /> {triggerLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 rounded-xl border-border p-0 shadow-lg" align="start">
        <Command>
          <CommandList>
            <CommandGroup>
              {templates.map((tpl) => (
                <CommandItem
                  key={tpl.id}
                  value={tpl.label}
                  onSelect={() => {
                    onSelect(tpl);
                    setOpen(false);
                  }}
                  className="flex-col items-start gap-0.5 rounded-lg py-2 pl-3"
                >
                  <span className="font-semibold text-foreground">{tpl.label}</span>
                  <span className="line-clamp-1 text-xs text-muted-foreground">{tpl.text}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
