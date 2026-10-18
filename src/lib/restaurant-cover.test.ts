import { describe, expect, it } from "vitest";
import { generatedRestaurantCover, restaurantInitials } from "./restaurant-cover";

const svgOf = (uri: string) =>
  decodeURIComponent(uri.replace("data:image/svg+xml;charset=utf-8,", ""));

describe("restaurant-cover", () => {
  it("iniciais sem palavras de ligação", () => {
    expect(restaurantInitials("Tasca do Mestre Zé")).toBe("TM");
    expect(restaurantInitials("M'banza Sabores")).toBe("MS");
    expect(restaurantInitials("Mar & Brasa")).toBe("MB");
    expect(restaurantInitials("Otto")).toBe("O");
  });

  it("cor e ícone pela cozinha, e a mesma capa sempre para o mesmo restaurante", () => {
    const seafood = svgOf(generatedRestaurantCover("Baía Azul", "Marisqueira"));
    const pizza = svgOf(generatedRestaurantCover("Kuito Pizza", "Italiana"));
    expect(seafood).toContain("#0E5E6F");
    expect(pizza).toContain("#8C2F1B");
    expect(seafood).toContain(">BA</text>");
    // A cozinha manda sobre o nome: "Tasca" angolana fica verde Luku, não bar.
    expect(svgOf(generatedRestaurantCover("Tasca do Mestre Zé", "Angolana"))).toContain("#1F4D3A");
    // Cozinha vaga: o nome ajuda.
    expect(svgOf(generatedRestaurantCover("Pizza do Escangalho", "Restaurante"))).toContain(
      "#8C2F1B",
    );
    expect(generatedRestaurantCover("Baía Azul", "Marisqueira")).toBe(
      generatedRestaurantCover("Baía Azul", "Marisqueira"),
    );
  });

  it("escapa o nome dentro do SVG", () => {
    expect(svgOf(generatedRestaurantCover("<b>Xis", ""))).not.toContain("<b>");
  });
});
