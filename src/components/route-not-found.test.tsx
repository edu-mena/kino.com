// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { screen } from "@testing-library/react";

import { renderWithProviders } from "@/test/render";
import { RouteNotFound } from "./route-not-found";

describe("RouteNotFound", () => {
  it("mostra 404 e o texto localizado (pt por omissão)", () => {
    renderWithProviders(<RouteNotFound />);
    expect(screen.getByRole("heading", { name: "404" })).toBeInTheDocument();
    expect(screen.getByText("Página não encontrada")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir para o início" })).toHaveAttribute("href", "/");
  });

  it("não tem violações de acessibilidade", async () => {
    const { container } = renderWithProviders(<RouteNotFound />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
