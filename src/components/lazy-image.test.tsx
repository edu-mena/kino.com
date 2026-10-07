// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { fireEvent, render } from "@testing-library/react";

import { LazyImage } from "./lazy-image";

describe("LazyImage", () => {
  it("por omissão é lazy e decodifica assíncrono", () => {
    const { container } = render(<LazyImage src="https://example.com/a.jpg" alt="prato" />);
    const img = container.querySelector("img")!;
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img).toHaveAttribute("decoding", "async");
    expect(img).toHaveAttribute("src", "https://example.com/a.jpg");
  });

  it("com `priority` carrega com prioridade alta", () => {
    const { container } = render(
      <LazyImage src="https://example.com/a.jpg" alt="prato" priority />,
    );
    const img = container.querySelector("img")!;
    expect(img).toHaveAttribute("loading", "eager");
    expect(img.getAttribute("fetchpriority")).toBe("high");
  });

  it("mostra o placeholder animado até carregar", () => {
    const { container } = render(<LazyImage src="https://example.com/a.jpg" alt="prato" />);
    expect(container.querySelector("img")!.className).toContain("animate-pulse");
  });

  it("sem proxy configurado não emite srcset (todas as entradas seriam iguais)", () => {
    const { container } = render(
      <LazyImage src="https://example.com/a.jpg" alt="prato" widths={[200, 400]} />,
    );
    expect(container.querySelector("img")!.hasAttribute("srcset")).toBe(false);
  });

  it("upload da app: usa as miniaturas e volta ao original se uma faltar", () => {
    const upload =
      "https://luku-media.fly.storage.tigris.dev/dish/user-63/5f077fc0-6867-4479-a221-cae192ad73c1.jpg";
    const { container } = render(
      <LazyImage src={upload} alt="prato" widths={[160, 320]} sizes="160px" />,
    );
    const img = container.querySelector("img")!;
    expect(img.getAttribute("src")).toMatch(/\.w480\.webp$/);
    expect(img.getAttribute("srcset")).toContain(".w160.webp 160w");

    fireEvent.error(img);

    expect(img.getAttribute("src")).toBe(upload);
    expect(img.hasAttribute("srcset")).toBe(false);
  });

  it("não tem violações de acessibilidade", async () => {
    const { container } = render(
      <LazyImage src="https://example.com/a.jpg" alt="Prato de mufete" />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
