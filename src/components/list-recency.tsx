import { enUS, fr as frLocale, ptBR } from "date-fns/locale";
import { CalendarDays, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/i18n";
import {
  EMPTY_CLIENT_LIST_FILTER,
  isClientListFilterActive,
  type ClientListFilter,
} from "@/lib/list-filter";
import type { RecencyBucket } from "@/lib/recency-groups";
import { BCP47 } from "@/lib/week";
import { cn } from "@/lib/utils";

const dateLocales = { pt: ptBR, en: enUS, fr: frLocale };

/** Separador de data ("Hoje", "Ontem", "Semana passada"…) entre grupos de uma lista. */
export function RecencyHeading({
  bucket,
  className,
}: {
  bucket: RecencyBucket;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <p
      className={cn(
        "text-[11px] font-bold uppercase tracking-wider text-muted-foreground",
        className,
      )}
    >
      {t(`recency.${bucket}`)}
    </p>
  );
}

/**
 * Filtros simplificados das listas do cliente (Pedidos, Reservas,
 * Notificações): restaurante + data (dia ou intervalo). As opções de
 * restaurante vêm da própria lista — só aparecem restaurantes onde o cliente
 * tem algo.
 */
export function ClientListFilters({
  restaurants,
  value,
  onChange,
  className,
}: {
  restaurants: { id: string; name: string }[];
  value: ClientListFilter;
  onChange: (next: ClientListFilter) => void;
  className?: string;
}) {
  const { t, locale } = useTranslation();
  const fmt = (d: Date) =>
    d.toLocaleDateString(BCP47[locale], { day: "numeric", month: "short", year: "numeric" });
  const { from, to } = value.range ?? {};
  const dateLabel = from
    ? to && to.getTime() !== from.getTime()
      ? `${fmt(from)} – ${fmt(to)}`
      : fmt(from)
    : t("listFilters.anyDate");
  const active = isClientListFilterActive(value);

  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center", className)}>
      <Select
        value={value.restaurantId ?? "__all"}
        onValueChange={(v) => onChange({ ...value, restaurantId: v === "__all" ? null : v })}
      >
        <SelectTrigger
          aria-label={t("listFilters.restaurantLabel")}
          className="h-10 w-full rounded-xl border-border bg-card text-sm sm:w-60"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-72 rounded-2xl">
          <SelectItem value="__all">{t("listFilters.allRestaurants")}</SelectItem>
          {restaurants.map((r) => (
            <SelectItem key={r.id} value={r.id}>
              {r.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={t("listFilters.dateLabel")}
            className={cn(
              "flex h-10 w-full items-center gap-2 rounded-xl border bg-card px-3 text-left text-sm transition-colors hover:border-primary sm:w-auto",
              from ? "border-primary text-primary" : "border-border text-foreground",
            )}
          >
            <CalendarDays className="h-4 w-4 shrink-0" />
            <span className="truncate">{dateLabel}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto rounded-2xl p-0">
          <Calendar
            mode="range"
            locale={dateLocales[locale]}
            selected={from ? { from, to } : undefined}
            onSelect={(range) => onChange({ ...value, range: range ?? undefined })}
            disabled={{ after: new Date() }}
            autoFocus
          />
          {from && (
            <div className="border-t border-border p-2">
              <button
                type="button"
                onClick={() => onChange({ ...value, range: undefined })}
                className="w-full rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
              >
                {t("listFilters.clearDate")}
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {active && (
        <button
          type="button"
          onClick={() => onChange(EMPTY_CLIENT_LIST_FILTER)}
          className="inline-flex items-center gap-1 self-start text-xs font-semibold text-muted-foreground hover:text-primary sm:self-auto"
        >
          <X className="h-3.5 w-3.5" />
          {t("listFilters.clear")}
        </button>
      )}
    </div>
  );
}

/** Estado vazio quando os filtros não deixam nada. */
export function FilteredEmpty({ onClear }: { onClear: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="card-soft grid place-items-center gap-2 p-10 text-center">
      <p className="text-sm text-muted-foreground">{t("listFilters.noResults")}</p>
      <button
        type="button"
        onClick={onClear}
        className="text-xs font-semibold text-primary hover:underline"
      >
        {t("listFilters.clear")}
      </button>
    </div>
  );
}
