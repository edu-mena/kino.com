import { describe, expect, it } from "vitest";
import { defaultWeeklyHours, isOpenNow, nextOpenAt } from "./opening-hours";
import type { WeeklyHours } from "@/data/types";

// Segunda-feira 14:00 e 23:30 (UTC local, mas só as horas/minutos importam).
const MON_14 = new Date("2026-01-05T14:00:00");
const MON_23_30 = new Date("2026-01-05T23:30:00");
const MON_02 = new Date("2026-01-05T02:00:00");
const TUE_01_30 = new Date("2026-01-06T01:30:00");

describe("isOpenNow", () => {
  it("está aberto dentro do intervalo do dia", () => {
    expect(isOpenNow(defaultWeeklyHours(), MON_14)).toBe(true);
  });

  it("está fechado fora do intervalo do dia", () => {
    expect(isOpenNow(defaultWeeklyHours(), MON_02)).toBe(false);
  });

  it("um dia marcado como fechado nunca abre", () => {
    const hours: WeeklyHours = defaultWeeklyHours();
    hours[0] = { open: false, ranges: [] };
    expect(isOpenNow(hours, MON_14)).toBe(false);
  });

  it("um intervalo que passa da meia-noite continua aberto depois das 00:00", () => {
    const hours: WeeklyHours = defaultWeeklyHours().map(() => ({
      open: true,
      ranges: [{ start: "20:00", end: "02:00" }],
    }));
    expect(isOpenNow(hours, MON_23_30)).toBe(true);
    expect(isOpenNow(hours, TUE_01_30)).toBe(true);
  });
});

describe("nextOpenAt", () => {
  it("devolve a hora de abertura de hoje quando ainda não abriu", () => {
    expect(nextOpenAt(defaultWeeklyHours(), "pt", MON_02)).toBe("11:00");
  });

  it("devolve undefined quando não há nenhum dia aberto", () => {
    const hours: WeeklyHours = defaultWeeklyHours().map(() => ({ open: false, ranges: [] }));
    expect(nextOpenAt(hours, "pt", MON_14)).toBeUndefined();
  });
});
