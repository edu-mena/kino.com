// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getProfileEdits, saveProfileEdits } from "./restaurant-profile-store";

/**
 * Regressão de um bug real: antes, galeria e resto do perfil viviam no
 * MESMO blob de localStorage (todos os restaurantes, todos os campos)
 * gravado numa única escrita. Uma quota excedida (comum com imagens em
 * base64) fazia essa escrita falhar por INTEIRO — editar qualquer outro
 * campo do perfil na mesma submissão também não gravava, mesmo sem imagem
 * nenhuma nova. Agora galeria e resto do perfil gravam em chaves
 * separadas, então uma falha num não arrasta o outro.
 */
describe("saveProfileEdits", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("saves non-gallery fields and gallery images independently", () => {
    const ok = saveProfileEdits("r-1", {
      description: "Novo texto",
      galleryImages: ["data:image/jpeg;base64,AAA"],
    });

    expect(ok).toBe(true);
    expect(getProfileEdits("r-1")).toEqual({
      description: "Novo texto",
      galleryImages: ["data:image/jpeg;base64,AAA"],
    });
  });

  it("still saves the rest of the profile even when the gallery write hits the storage quota", () => {
    const realSetItem = Storage.prototype.setItem.bind(localStorage);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation((key, value) => {
      if (key === "luku_restaurant_gallery_edits") {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      }
      realSetItem(key, value);
    });

    const ok = saveProfileEdits("r-1", {
      description: "Novo texto",
      phone: "923000000",
      galleryImages: ["data:image/jpeg;base64,AAA"],
    });

    // A escrita geral falhou (retorna false), mas description/phone
    // gravaram mesmo assim — antes do fix, nada gravava neste cenário.
    expect(ok).toBe(false);
    expect(getProfileEdits("r-1")).toEqual({
      description: "Novo texto",
      phone: "923000000",
    });
  });

  it("still saves the gallery even when the rest-of-profile write hits the storage quota", () => {
    const realSetItem = Storage.prototype.setItem.bind(localStorage);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation((key, value) => {
      if (key === "luku_restaurant_profile_edits") {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      }
      realSetItem(key, value);
    });

    const ok = saveProfileEdits("r-1", {
      description: "Não deve gravar",
      galleryImages: ["data:image/jpeg;base64,AAA"],
    });

    expect(ok).toBe(false);
    expect(getProfileEdits("r-1")).toEqual({
      galleryImages: ["data:image/jpeg;base64,AAA"],
    });
  });
});
