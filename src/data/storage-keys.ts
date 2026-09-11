/**
 * Todas as chaves de `localStorage` usadas pela app, num só sítio. Sem
 * backend, cada domínio guarda o seu snapshot local — ter as chaves aqui
 * evita colisões e typos, e dá um mapa do que vai precisar de migração
 * quando o backend entrar. O sufixo `_vN` sobe quando o formato da seed
 * muda de forma incompatível.
 */
export const STORAGE_KEYS = {
  authUser: "luku_auth_user",
  systemOperator: "luku_system_operator",
  activeBill: "luku_active_bill",
  cartOrders: "luku_cart_orders_v3",
  reservations: "luku_reservations_v2",
  couriers: "luku_couriers_v1",
  restaurantAdmin: "luku_admin_restaurant",
  restaurantProfileEdits: "luku_restaurant_profile_edits",
  restaurantTables: "luku_restaurant_tables_v1",
  customRestaurants: "luku_custom_restaurants_v1",
  subscriptions: "luku_system_subscriptions_v1",
  partnerApps: "luku_system_partner_apps_v1",
  systemRestaurantFlags: "luku_system_restaurant_flags_v1",
  supportTickets: "luku_support_tickets_v1",
  reviews: "luku_reviews_v1",
  notifications: "luku_notifications_v1",
  customerNotes: "luku_customer_notes",
  profileViews: "luku_profile_views_v1",
} as const;

/** Evento disparado por todas as stores puras quando escrevem — os
 * providers ouvem-no para recarregar. */
export const CHANGE_EVENT = "luku:menu-changed";
