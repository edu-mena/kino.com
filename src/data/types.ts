/**
 * Tipos para o dataset mockado em `src/data/mockData.ts`.
 *
 * Este arquivo não existia antes — foi inferido a partir do uso real dos
 * campos em mockData.ts. `category` (em MenuItem) e `cautionStatus` /
 * `status` (em Reservation) ficam como `string` em vez de union estrita
 * porque os valores usados hoje ainda não estão padronizados; vale
 * revisitar quando este dataset for ligado à aplicação de verdade.
 */

/** Modo de entrega/consumo de um pedido.
 * `delivery` = entrega ao domicílio · `takeaway` = levantar ao balcão ·
 * `dinein` = consumir no local. */
export type FulfillmentType = "delivery" | "takeaway" | "dinein";

export interface Restaurant {
  id: string;
  name: string;
  description: string;
  cuisine: string;
  /** "Kz" | "Kz Kz" | "Kz Kz Kz" — CALCULADO em `withOverrides` a partir da
   * média de preços do cardápio (`@/lib/price-level`), nunca definido à mão.
   * O valor no seed é só um valor inicial, ignorado assim que há cardápio. */
  priceLevel: string;
  rating: number;
  reviewCount: number;
  distanceKm: number;
  address: string;
  /** Nome mantido por compatibilidade, mas o valor é a província (ex:
   * "Luanda", "Huambo") — granularidade do seletor de localização em toda a
   * app. O bairro/zona específico, quando relevante, vive em `address`. */
  neighborhood: string;
  city: string;
  /** Localização exata no mapa. Ausente no seed — derivada da província em
   * `withOverrides` (`@/data/helpers`) até o gestor a definir em
   * `/admin/perfil`. */
  lat?: number;
  lng?: number;
  phone: string;
  email: string;
  openingHours: string;
  coverImage: string;
  galleryImages: string[];
  isDeliveryAvailable: boolean;
  /** Modos de pedido que o restaurante oferece. Ausente = derivado:
   * `delivery` só se `isDeliveryAvailable`, mais `takeaway` e `dinein`
   * (qualquer restaurante pode servir ao balcão / no local). Ver
   * `getRestaurantFulfillmentModes` em `@/data/helpers`. */
  fulfillmentModes?: FulfillmentType[];
  /** Ids de métodos de pagamento aceites (ver `paymentMethods` em
   * `@/lib/mock-data`). Ausente/vazio = aceita todos. O restaurante escolhe
   * de entre estes o método exigido ao aceitar cada pedido. */
  acceptedPaymentMethods?: string[];
  /** Dados de destino do pagamento, por id de método — texto livre (IBAN +
   * titular para "transferencia", nº de telefone / carteira para os
   * digitais). Definidos pelo restaurante em `/admin/perfil`; o cliente
   * vê-os em `/entrega` depois de o restaurante fixar o método exigido.
   * "cash" (numerário) não precisa. */
  paymentDetails?: Record<string, string>;
  /** Modos de pedido para os quais a caução (`cautionAmount`) é exigida como
   * garantia — a par do uso em reservas. Ausente = nenhum (caução fica só
   * nas reservas). */
  cautionModesForOrders?: FulfillmentType[];
  /** Províncias cobertas pela entrega — nem toda província tem cobertura.
   * Quando ausente e `isDeliveryAvailable` é true, assume-se cobertura só na
   * própria província (`neighborhood`). Ignorado quando `isDeliveryAvailable`
   * é false (o restaurante simplesmente não entrega, em nenhuma área). */
  deliveryZones?: string[];
  deliveryFee: number;
  estimatedDeliveryMinutes: number;
  cautionAmount: number;
  cautionPolicyNotice: string;
  isFeatured: boolean;
  /** Aceita pedidos de reserva de mesa online. Ausente = true (a maioria
   * aceita); false esconde o fluxo de reserva no lado do cliente. */
  acceptsReservations?: boolean;
  /** Duração média de uma reserva, em minutos — base da janela de ocupação
   * usada para detetar sobre-reservas em `/admin/reservas`. Ausente = 120. */
  reservationSlotMinutes?: number;
  /** Horário estruturado por dia da semana (índice 0 = segunda). Quando
   * ausente, `helpers.ts` sintetiza um a partir do id. `openingHours`
   * (string) passa a ser derivado deste. */
  hours?: WeeklyHours;
  /** Override manual: o restaurante pausou os pedidos agora, independente
   * do horário. */
  ordersPausedManually?: boolean;
}

/** Um intervalo de funcionamento, "HH:mm"–"HH:mm". `end` pode ser menor que
 * `start` (fecha depois da meia-noite). */
export interface HoursRange {
  start: string;
  end: string;
}
export interface DayHours {
  open: boolean;
  ranges: HoursRange[];
}
/** 7 dias, índice 0 = segunda-feira. */
export type WeeklyHours = DayHours[];

export interface MenuItemIngredient {
  id: string;
  name: string;
  /** true = ingrediente principal/essencial do prato (o cliente pode
   * desmarcá-lo); false = ingrediente adicional, com custo extra opcional
   * (`extraPrice`). Nome do campo mantido por compatibilidade com o dataset
   * já existente — na interface do painel chama-se "Principal"/"Adicional". */
  removable: boolean;
  /** Presente só em ingredientes adicionais (ex: "Bacon Extra"). */
  extraPrice?: number;
}

/**
 * Cardápio nomeado de um restaurante (ex: "Cardápio Principal", "Menu de
 * cada restaurante tem um único cardápio, o "Cardápio Principal" sintético
 * criado automaticamente (ver `@/data/menus-store`, `defaultMenuId`) — a
 * organização dos pratos é feita só por categoria. Este tipo mantém-se
 * porque o documento do cardápio (PDF / `/menu/$restaurantId`) ainda itera
 * sobre uma lista de cardápios (agora sempre com um só elemento).
 */
export interface RestaurantMenu {
  id: string;
  restaurantId: string;
  name: string;
  isActive: boolean;
  /** Chave de tipo de cardápio, legado — hoje sempre ausente. */
  category?: string;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  /** Cardápio a que este prato pertence. Ausente nos itens do dataset
   * inicial (seed) — nesse caso assume-se o cardápio principal sintético
   * do restaurante (ver `@/data/menus-store`, `defaultMenuId`). */
  menuId?: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  isAvailable: boolean;
  portionInfo: string;
  prepTimeMinutes: number;
  isPromoted?: boolean;
  promotionLabel?: string;
  ingredients: MenuItemIngredient[];
  /** Sinal para a secção de "Tendências" — quantas vezes foi pedido recentemente. */
  orderCount?: number;
  /** Marca explícita para destacar num carrossel de tendências. */
  isTrending?: boolean;
}

export interface SelectedIngredient {
  id: string;
  name: string;
  included: boolean;
}

export interface CartItem {
  id: string;
  menuItem: MenuItem;
  restaurantId: string;
  quantity: number;
  selectedIngredients: SelectedIngredient[];
  customQuestion?: string;
  customQuestionAnswer?: string;
}

export interface Reservation {
  id: string;
  restaurantId: string;
  /** Dono da reserva no lado do cliente (`viewerKey` no momento do pedido:
   * conta autenticada ou convidado). Ausente nas reservas da seed — que por
   * isso nunca aparecem em `/reservas` como sendo de quem está a ver. */
  ownerKey?: string;
  restaurantName: string;
  restaurantImage: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:mm"
  peopleCount: number;
  cautionAmount: number;
  cautionStatus: string;
  /** "Pendente" | "Confirmada" | "Recusada" | "Cancelada" | "Anulada".
   * `Cancelada` = o cliente desistiu enquanto ainda "Pendente"; `Recusada` =
   * o restaurante recusou um pedido "Pendente"; `Anulada` = o restaurante
   * cancelou uma reserva que já tinha confirmado. String livre por
   * compatibilidade. */
  status: string;
  /** Mesa atribuída pelo restaurante ao confirmar (ver `@/data/tables-store`). */
  tableId?: string;
  specialRequests?: string;
  createdAt: string;
}

export interface DeliveryOrder {
  id: string;
  restaurantId: string;
  restaurantName: string;
  restaurantImage: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerEmail: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: string;
  deliveryTimeOption: string;
  status: string;
  createdAt: string;
  estimatedTimeMinutes: number;
}

export interface Review {
  id: string;
  restaurantId: string;
  customerName: string;
  rating: number;
  date: string;
  comment: string;
  tags: string[];
}

export interface RegisteredCustomer {
  id: string;
  name: string;
  phone: string;
  email: string;
  registeredDate: string;
  orderCount: number;
  reservationCount: number;
  notes?: string;
}

export interface UserProfile {
  isLoggedIn: boolean;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  defaultAddress: string;
  locationPermissionGranted: boolean;
  userNeighborhood: string;
  authMethod: "google" | "email";
}

export interface Offer {
  id: string;
  /** Ausente = promoção da própria Kino (geridas centralmente, nunca
   * editáveis no painel do restaurante). Presente = promoção criada por um
   * restaurante em `/admin/promocoes`. */
  restaurantId?: string;
  type: "discount" | "delivery" | "happy-hour";
  title: string;
  description: string;
  code?: string;
  /** Só em `type: "discount"` / `"happy-hour"`. Percentagem descontada do
   * subtotal de produtos quando o cliente aplica `code` no pedido. Ausente
   * (ou em `type: "delivery"`, que dá entrega grátis) = o código é apenas
   * informativo. */
  percentOff?: number;
  /** Media da promoção — URL colada, data URL de imagem, ou data URL de
   * vídeo (upload com corte, máx. 10 s). Ausente = usa uma imagem
   * decorativa genérica no carrossel da home. */
  image?: string;
  /** `"video"` quando `image` é um data URL de vídeo. Nesse caso
   * `thumbnail` traz o frame de pré-visualização. Ausente = imagem. */
  mediaType?: "image" | "video";
  /** Frame de pré-visualização (JPEG data URL) — só em
   * `mediaType === "video"`. Usado onde não dá para reproduzir o vídeo
   * (listas do painel, página de Ofertas). */
  thumbnail?: string;
  /** Formato de exibição no carrossel da home. Ausente = alterna
   * automaticamente (`split`/`cover`) pela posição. */
  layout?: "split" | "cover";
}

export interface SavedAddress {
  id: string;
  label: string;
  line1: string;
  line2: string;
  isDefault?: boolean;
  /** Coordenadas da morada. Hoje ausentes (moradas são texto livre);
   * preenchidas pelo autocomplete/geocoding quando o backend de mapas
   * estiver ligado — ver `@/lib/maps`. Consumidores devem tolerar
   * `undefined` e recair na província extraída de `line2`. */
  lat?: number;
  lng?: number;
}

/**
 * Story de um restaurante (imagem ou vídeo curto). Stories criados no painel
 * auto-expiram 24h depois de `createdAt` — igual WhatsApp/Instagram (ver
 * `STORY_TTL_MS` em `@/data/stories-store`).
 */
export interface RestaurantStory {
  id: string;
  restaurantId: string;
  /** Fonte da media — data URL (upload) ou URL. Vale para imagem e vídeo. */
  image: string;
  /** Ausente = "image" (compatibilidade com o seed). */
  mediaType?: "image" | "video";
  /** Duração real do vídeo, em segundos (só quando `mediaType === "video"`). */
  durationSec?: number;
  createdAt: string; // ISO
}
