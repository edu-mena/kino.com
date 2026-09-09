import { describe, expect, it } from "vitest";
import { cropOutputSize } from "./image-upload";

describe("cropOutputSize", () => {
  it("mantém o lado maior em maxDimension para rácio panorâmico", () => {
    expect(cropOutputSize(16 / 9, 1600)).toEqual({ width: 1600, height: 900 });
  });

  it("devolve um quadrado para rácio 1", () => {
    expect(cropOutputSize(1, 900)).toEqual({ width: 900, height: 900 });
  });

  it("mantém a altura em maxDimension para rácio vertical", () => {
    expect(cropOutputSize(9 / 16, 1280)).toEqual({ width: 720, height: 1280 });
  });

  it("nunca devolve uma dimensão < 1", () => {
    const { width, height } = cropOutputSize(0.001, 10);
    expect(width).toBeGreaterThanOrEqual(1);
    expect(height).toBeGreaterThanOrEqual(1);
  });
});
