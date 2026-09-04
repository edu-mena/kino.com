// @vitest-environment jsdom
import { Heart } from "lucide-react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { render, screen } from "@testing-library/react";

import { EmptyState } from "./empty-state";

describe("EmptyState", () => {
  it("mostra título, descrição e ação", () => {
    render(
      <EmptyState
        icon={Heart}
        title="Sem favoritos"
        description="Ainda não guardou restaurantes."
        action={<a href="/restaurantes">Explorar</a>}
      />,
    );
    expect(screen.getByText("Sem favoritos")).toBeInTheDocument();
    expect(screen.getByText("Ainda não guardou restaurantes.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Explorar" })).toHaveAttribute("href", "/restaurantes");
  });

  it("funciona só com descrição", () => {
    render(<EmptyState description="Nada aqui" />);
    expect(screen.getByText("Nada aqui")).toBeInTheDocument();
  });

  it("não tem violações de acessibilidade", async () => {
    const { container } = render(
      <EmptyState icon={Heart} title="Sem resultados" description="Tente outro filtro." />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
