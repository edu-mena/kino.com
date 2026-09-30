import { Loader2, MapPin } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "@/i18n";
import { isGoogleMapsEnabled } from "@/lib/maps/config";
import {
  fetchAddressSuggestions,
  newAutocompleteSession,
  resolveSuggestion,
  type AddressSuggestion,
} from "@/lib/maps/google-js";
import type { GeocodeResult, LatLng } from "@/lib/maps/types";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { cn } from "@/lib/utils";

/**
 * Campo de morada com sugestões da Google (Places API New), restritas a
 * Angola. Escolher uma sugestão devolve (`onSelect`) as coordenadas reais,
 * a morada formatada e a província — é isso que posiciona o pino no mapa,
 * em vez de o utilizador ter de o arrastar à mão.
 *
 * Sem Google configurado (`isGoogleMapsEnabled` falso: demo/dev) é
 * exatamente o `<input>` de antes — nada muda nesses ambientes.
 *
 * Sessão de autocomplete: um token por "procura" (do primeiro carácter até
 * escolher) — a Google cobra a sessão como um único pedido de detalhes.
 */
/** Por omissão, o mesmo aspeto do `<Input>` do UI kit. */
const INPUT_KIT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm";

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  inputClassName = INPUT_KIT_CLASS,
  leadingIcon,
  near,
  autoFocus,
  id,
}: {
  value: string;
  /** Texto livre (cada tecla) — escrever depois de escolher invalida a escolha. */
  onChange: (text: string) => void;
  onSelect: (result: GeocodeResult) => void;
  placeholder?: string;
  inputClassName?: string;
  /** Ícone absoluto à esquerda (o input deve ter o padding correspondente). */
  leadingIcon?: ReactNode;
  /** Viés das sugestões (ex.: centro da província escolhida). */
  near?: LatLng | undefined;
  autoFocus?: boolean;
  id?: string;
}) {
  const { t } = useTranslation();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [highlight, setHighlight] = useState(0);
  const sessionRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  // Depois de escolher, o texto muda para a morada formatada — isso não deve
  // disparar nova procura.
  const skipNextRef = useRef(false);
  const debounced = useDebouncedValue(value, 250);

  useEffect(() => {
    if (!isGoogleMapsEnabled) return;
    if (skipNextRef.current) {
      skipNextRef.current = false;
      return;
    }
    const q = debounced.trim();
    if (q.length < 3) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(false);
    void (async () => {
      try {
        sessionRef.current ??= await newAutocompleteSession();
        const list = await fetchAddressSuggestions(q, sessionRef.current, near);
        if (cancelled) return;
        setSuggestions(list);
        setHighlight(0);
      } catch {
        if (!cancelled) {
          setSuggestions([]);
          setError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const choose = async (s: AddressSuggestion) => {
    setOpen(false);
    setLoading(true);
    try {
      const result = await resolveSuggestion(s);
      if (result) {
        skipNextRef.current = true;
        onChange(result.formattedAddress);
        onSelect(result);
      }
    } catch {
      setError(true);
    } finally {
      sessionRef.current = null;
      setSuggestions([]);
      setLoading(false);
    }
  };

  if (!isGoogleMapsEnabled) {
    return (
      <div className="relative">
        {leadingIcon}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputClassName}
          autoFocus={autoFocus}
          id={id}
        />
      </div>
    );
  }

  const q = value.trim();
  const showPanel = open && q.length >= 3;

  return (
    <div className="relative">
      {leadingIcon}
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (!showPanel || suggestions.length === 0) {
            if (e.key === "Escape") setOpen(false);
            return;
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter") {
            // Nunca deixar o Enter submeter o formulário à volta com a lista aberta.
            e.preventDefault();
            const s = suggestions[highlight];
            if (s) void choose(s);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        className={inputClassName}
        autoFocus={autoFocus}
        id={id}
        autoComplete="off"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
      />
      {loading && (
        <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}

      {showPanel && (
        <div className="absolute inset-x-0 top-full z-50 mt-1.5 overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-lg">
          {suggestions.length > 0 ? (
            <ul id={listId} role="listbox" className="max-h-64 overflow-y-auto p-1.5">
              {suggestions.map((s, i) => (
                <li key={s.id} role="option" aria-selected={i === highlight}>
                  <button
                    type="button"
                    // `mousedown` antes do `blur` do input — senão o painel
                    // fechava antes de o clique chegar aqui.
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => void choose(s)}
                    onMouseEnter={() => setHighlight(i)}
                    className={cn(
                      "flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors",
                      i === highlight ? "bg-surface" : "hover:bg-surface",
                    )}
                  >
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {s.primary}
                      </span>
                      {s.secondary && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {s.secondary}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-3 text-xs text-muted-foreground">
              {loading
                ? t("addressAutocomplete.searching")
                : error
                  ? t("addressAutocomplete.error")
                  : t("addressAutocomplete.noResults")}
            </p>
          )}
          <p className="border-t border-border px-4 py-1.5 text-right text-[10px] text-muted-foreground">
            {t("addressAutocomplete.poweredBy")}
          </p>
        </div>
      )}
    </div>
  );
}
