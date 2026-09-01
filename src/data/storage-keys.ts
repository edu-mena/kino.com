/**
 * Todas as chaves de `localStorage` usadas pela app, num só sítio. Sem
 * backend, cada domínio guarda o seu snapshot local — ter as chaves aqui
 * evita colisões e typos, e dá um mapa do que vai precisar de migração
 * quando o backend entrar. O sufixo `_vN` sobe quando o formato da seed
 * muda de forma incompatível.
 */
export const STORAGE_KEYS = {
  authUser: "kino_auth_user",
  systemOperator: "kino_system_operator",
  activeBill: "kino_active_bill",
  cartOrders: "kino_cart_orders_v3",
  reservations: "kino_reservations_v2",
  couriers: "kino_couriers_v1",
  restaurantAdmin: "kino_admin_restaurant",
  restaurantProfileEdits: "kino_restaurant_profile_edits",
  restaurantTables: "kino_restaurant_tables_v1",
  customRestaurants: "kino_custom_restaurants_v1",
  subscriptions: "kino_system_subscriptions_v1",
  partnerApps: "kino_system_partner_apps_v1",
  systemRestaurantFlags: "kino_system_restaurant_flags_v1",
  supportTickets: "kino_support_tickets_v1",
  reviews: "kino_reviews_v1",
  notifications: "kino_notifications_v1",
  customerNotes: "kino_customer_notes",
} as const;

/** Evento disparado por todas as stores puras quando escrevem — os
 * providers ouvem-no para recarregar. */
export const CHANGE_EVENT = "kino:menu-changed";
