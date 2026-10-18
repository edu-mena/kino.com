import { describe, expect, it } from "vitest";
import { DISH_PLACEHOLDER, hasRealPhoto, photosFirst } from "./dish-photo";

const dish = (id: string, hasPhoto?: boolean) => ({
  id,
  ...(hasPhoto === undefined ? {} : { hasPhoto }),
  image: hasPhoto === false ? DISH_PLACEHOLDER : `https://cdn.luku.ao/${id}.webp`,
});

describe("dish-photo", () => {
  it("só conta como foto real a foto do próprio prato", () => {
    expect(hasRealPhoto(dish("a", true))).toBe(true);
    expect(hasRealPhoto(dish("b"))).toBe(true); // mock: sempre com foto
    expect(hasRealPhoto(dish("c", false))).toBe(false);
  });

  it("põe os pratos com foto primeiro sem baralhar a ordem de cada grupo", () => {
    const items = [dish("1", false), dish("2", true), dish("3", false), dish("4", true)];
    expect(photosFirst(items).map((d) => d.id)).toEqual(["2", "4", "1", "3"]);
  });
});
