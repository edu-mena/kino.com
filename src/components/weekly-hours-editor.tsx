import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { WeeklyHours } from "@/data/types";
import { useTranslation } from "@/i18n";

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

/** Editor de horário semanal — 7 linhas, cada uma com toggle aberto/fechado e
 * intervalos "HH:mm"–"HH:mm" com adicionar/remover. Índice 0 = segunda. */
export function WeeklyHoursEditor({
  value,
  onChange,
}: {
  value: WeeklyHours;
  onChange: (next: WeeklyHours) => void;
}) {
  const { t } = useTranslation();

  const patchDay = (i: number, patch: Partial<WeeklyHours[number]>) =>
    onChange(value.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));

  return (
    <div className="space-y-2">
      {value.map((day, i) => (
        <div key={DAY_KEYS[i]} className="rounded-xl border border-border p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">
              {t(`openingHours.day.${DAY_KEYS[i]}`)}
            </span>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              {day.open ? t("openingHours.open") : t("openingHours.closed")}
              <Switch
                checked={day.open}
                onCheckedChange={(open) =>
                  patchDay(i, {
                    open,
                    ranges:
                      open && day.ranges.length === 0
                        ? [{ start: "11:00", end: "23:00" }]
                        : day.ranges,
                  })
                }
              />
            </label>
          </div>

          {day.open && (
            <div className="mt-2 space-y-2">
              {day.ranges.map((r, ri) => (
                <div key={ri} className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={r.start}
                    onChange={(e) =>
                      patchDay(i, {
                        ranges: day.ranges.map((x, xi) =>
                          xi === ri ? { ...x, start: e.target.value } : x,
                        ),
                      })
                    }
                    className="w-28"
                  />
                  <span className="text-muted-foreground">–</span>
                  <Input
                    type="time"
                    value={r.end}
                    onChange={(e) =>
                      patchDay(i, {
                        ranges: day.ranges.map((x, xi) =>
                          xi === ri ? { ...x, end: e.target.value } : x,
                        ),
                      })
                    }
                    className="w-28"
                  />
                  <button
                    type="button"
                    aria-label={t("openingHours.removeRange")}
                    onClick={() => patchDay(i, { ranges: day.ranges.filter((_, xi) => xi !== ri) })}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  patchDay(i, { ranges: [...day.ranges, { start: "18:00", end: "22:00" }] })
                }
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand"
              >
                <Plus className="h-3.5 w-3.5" /> {t("openingHours.addRange")}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
