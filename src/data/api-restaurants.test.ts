import { describe, expect, it } from "vitest";
import { mapApiRestaurant } from "./api-restaurants";

/**
 * Regressão de um bug real em produção: a API devolve `cuisine`/
 * `neighborhood`/`city` como `null` sempre que o restaurante nunca
 * preencheu esses campos (comum — candidatura de parceiro não pede tipo de
 * cozinha). `admin.perfil.tsx` semeava o formulário com esse `null` e
 * `cuisine.trim()` rebentava com TypeError a meio da gravação do perfil —
 * a exceção acontecia a meio da construção do pedido, então o PATCH nunca
 * chegava a ser enviado, mas o admin só via "não foi possível guardar",
 * sem pista nenhuma do porquê.
 */
describe("mapApiRestaurant", () => {
  const minimalApiRestaurant = {
    id: "r-1",
    name: "Restaurante Teste",
    description: null,
    cuisine: null,
    rating: null,
    reviewCount: 0,
    address: null,
    neighborhood: null,
    city: null,
    lat: null,
    lng: null,
    phone: null,
    email: null,
    coverImageUrl: null,
    isDeliveryAvailable: false,
    fulfillmentModes: [],
    acceptedPaymentMethods: [],
    cautionModesForOrders: [],
    deliveryZones: [],
    deliveryFee: 0,
    estimatedDeliveryMinutes: null,
    cautionAmount: 0,
    cautionPolicyNotice: null,
    buffetPrice: null,
    buffetHoursNotice: null,
    buffetTableTimeLimitMinutes: null,
    isFeatured: false,
    acceptsReservations: true,
    reservationSlotMinutes: 120,
    reservationCancellationWindowMinutes: 30,
    ordersPausedManually: false,
    isSuspended: false,
  };

  it("never returns null for cuisine/neighborhood/city, even when the API sends null", () => {
    const restaurant = mapApiRestaurant(minimalApiRestaurant);

    expect(restaurant.cuisine).toBe("");
    expect(restaurant.neighborhood).toBe("");
    expect(restaurant.city).toBe("");
    // A causa exata do bug: chamar .trim() (como admin.perfil.tsx faz ao
    // gravar) nunca deve rebentar.
    expect(() => restaurant.cuisine.trim()).not.toThrow();
    expect(() => restaurant.neighborhood.trim()).not.toThrow();
    expect(() => restaurant.city.trim()).not.toThrow();
  });

  it("still uses the real values when the API sends them", () => {
    const restaurant = mapApiRestaurant({
      ...minimalApiRestaurant,
      cuisine: "Angolana",
      neighborhood: "Talatona",
      city: "Luanda",
    });

    expect(restaurant.cuisine).toBe("Angolana");
    expect(restaurant.neighborhood).toBe("Talatona");
    expect(restaurant.city).toBe("Luanda");
  });
});
