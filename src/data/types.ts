/**
 * Tipos para o dataset mockado em `src/data/mockData.ts`.
 *
 * Este arquivo não existia antes — foi inferido a partir do uso real dos
 * campos em mockData.ts. `category` (em MenuItem) e `cautionStatus` /
 * `status` (em Reservation) ficam como `string` em vez de union estrita
 * porque os valores usados hoje ainda não estão padronizados; vale
 * revisitar quando este dataset for ligado à aplicação de verdade.
 */

export interface Restaurant {
  id: string;
  name: string;
  description: string;
  cuisine: string;
  priceLevel: string; // ex: "Kz", "Kz Kz", "Kz Kz Kz"
  rating: number;
  reviewCount: number;
  distanceKm: number;
  address: string;
  neighborhood: string;
  city: string;
  phone: string;
  email: string;
  openingHours: string;
  coverImage: string;
  galleryImages: string[];
  isDeliveryAvailable: boolean;
  /** Bairros cobertos pela entrega — nem toda área de Luanda tem cobertura.
   * Quando ausente e `isDeliveryAvailable` é true, assume-se cobertura só no
   * próprio bairro (`neighborhood`). Ignorado quando `isDeliveryAvailable`
   * é false (o restaurante simplesmente não entrega, em nenhuma área). */
  deliveryZones?: string[];
  deliveryFee: number;
  estimatedDeliveryMinutes: number;
  cautionAmount: number;
  cautionPolicyNotice: string;
  isFeatured: boolean;
}

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
 * Fim de Semana") — um restaurante pode ter vários, geridos em
 * `/admin/cardapio`. Só pratos de cardápios com `isActive: true` aparecem
 * para os clientes; os restantes ficam como rascunho, visíveis só no
 * painel. Todo restaurante tem sempre pelo menos um (o "Cardápio
 * Principal" sintético, criado automaticamente — ver `@/data/menus-store`).
 */
export interface RestaurantMenu {
  id: string;
  restaurantId: string;
  name: string;
  isActive: boolean;
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
  status: string;
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
}

export interface SavedAddress {
  id: string;
  label: string;
  line1: string;
  line2: string;
  isDefault?: boolean;
}

/** Story de um restaurante (imagem única, expira depois de 24h — igual WhatsApp/Instagram). */
export interface RestaurantStory {
  id: string;
  restaurantId: string;
  image: string;
  createdAt: string; // ISO
}
