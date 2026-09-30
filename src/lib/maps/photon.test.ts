import { describe, expect, it } from "vitest";
import { decodePolyline } from "./osrm";
import { canonicalProvince, toSuggestion } from "./photon";

// Respostas reais do Photon (Luanda), resumidas.
const street = {
  geometry: { coordinates: [13.2360919, -8.8134512] as [number, number] },
  properties: {
    osm_type: "W",
    osm_id: 732978825,
    type: "street",
    name: "Rua Rainha Jinga",
    locality: "Mutamba",
    district: "Kinanga",
    city: "Luanda",
    state: "Luanda",
    countrycode: "AO",
    extent: [13.2305823, -8.8094002, 13.2401273, -8.8141119] as [number, number, number, number],
  },
};
const bank = {
  geometry: { coordinates: [13.2390609, -8.8100279] as [number, number] },
  properties: {
    osm_type: "N",
    osm_id: 5978058666,
    type: "house",
    name: "Banco Económico - Agência Rainha Ginga",
    street: "Rua Rainha Jinga",
    locality: "Mutamba",
    city: "Luanda",
    state: "Luanda",
    countrycode: "AO",
  },
};

describe("toSuggestion (Photon)", () => {
  it("local exato: 150 m de afinação e morada com contexto", () => {
    const s = toSuggestion(bank)!;
    expect(s.primary).toBe("Banco Económico - Agência Rainha Ginga");
    expect(s.secondary).toBe("Rua Rainha Jinga, Mutamba, Luanda");
    expect(s.radiusMeters).toBe(150);
    expect(s.result.point).toEqual({ lat: -8.8100279, lng: 13.2390609 });
    expect(s.result.province).toBe("Luanda");
  });

  it("rua: raio = metade da extensão (uma rua comprida não tem um só ponto)", () => {
    const s = toSuggestion(street)!;
    expect(s.radiusMeters).toBeGreaterThan(500);
    expect(s.radiusMeters).toBeLessThanOrEqual(2000);
  });

  it("bairro sem extensão (ex.: Talatona): raio de bairro, não 150 m do centro", () => {
    const district = {
      geometry: { coordinates: [13.2, -8.9] as [number, number] },
      properties: { type: "district", name: "Talatona", city: "Luanda", countrycode: "AO" },
    };
    expect(toSuggestion(district)!.radiusMeters).toBe(2000);
  });

  it("cidade/província inteira é vaga demais para marcar um local", () => {
    const city = { ...street, properties: { ...street.properties, type: "city", name: "Luanda" } };
    expect(toSuggestion(city)!.radiusMeters).toBeNull();
  });

  it("ignora resultados fora de Angola", () => {
    const pt = { ...bank, properties: { ...bank.properties, countrycode: "PT" } };
    expect(toSuggestion(pt)).toBeNull();
  });

  it("reverse: prefere a rua ao nome do negócio vizinho", () => {
    expect(toSuggestion(bank, true)!.primary).toBe("Rua Rainha Jinga");
  });
});

describe("canonicalProvince", () => {
  it.each([
    ["Província de Luanda", "Luanda"],
    ["Huila", "Huíla"],
    ["Benguela Province", "Benguela"],
    ["Icolo e Bengo", "Icolo e Bengo"],
  ])("%s → %s", (input, out) => {
    expect(canonicalProvince(input)).toBe(out);
  });
});

describe("decodePolyline", () => {
  it("descodifica o exemplo da especificação", () => {
    expect(decodePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@")).toEqual([
      { lat: 38.5, lng: -120.2 },
      { lat: 40.7, lng: -120.95 },
      { lat: 43.252, lng: -126.453 },
    ]);
  });
});
