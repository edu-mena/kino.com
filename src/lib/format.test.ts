import { describe, expect, it } from "vitest";
import { formatKz } from "./format";

describe("formatKz", () => {
  it("prefixes the amount with AOA", () => {
    expect(formatKz(1000)).toMatch(/^AOA\s/);
  });

  it("formats a round number with a thousands separator, no decimals", () => {
    expect(formatKz(8500).replace(/\s/g, " ")).toBe("AOA 8 500");
  });

  it("formats zero", () => {
    expect(formatKz(0)).toBe("AOA 0");
  });

  it("never shows decimal places, even for a fractional value", () => {
    expect(formatKz(1234.56)).not.toMatch(/[.,]\d{1,2}(\D|$)/);
  });
});
