import type { HelpArticle } from "./index";

/** English — mirrors the exact `id`s (and order) of `pt.ts`. */
export const helpArticlesEn: HelpArticle[] = [
  {
    id: "how-to-order",
    question: "How do I place an order?",
    answer:
      "Each restaurant has its own rules for takeaway orders, scheduling dishes and table reservations. Those rules are shown on the chosen restaurant's page before you finalize the order.",
  },
  {
    id: "how-to-pay",
    question: "How do payments work?",
    answer:
      "Kino.com doesn't take payments directly from customers — it only connects customers and restaurants. Payment is arranged directly with the chosen restaurant.",
  },
  {
    id: "delivery-time",
    question: "What's the delivery time?",
    answer:
      "Delivery time is set and managed by the restaurant itself, based on your location and availability at the time of the order.",
  },
  {
    id: "track-order",
    question: "How do I track my order?",
    answer: "Order tracking is handled directly with the chosen restaurant.",
  },
  {
    id: "cancel-order",
    question: "How do I cancel my order?",
    answer:
      "Cancellation follows the rules set by the restaurant — contact them directly as soon as possible.",
  },
  {
    id: "refunds",
    question: "How do refunds and returns work?",
    answer: "Refunds and returns are handled directly with the restaurant, same as cancellations.",
  },
  {
    id: "how-kino-works",
    question: "How does Kino.com work?",
    answer:
      "Kino.com is a platform that connects customers and restaurants in Luanda — it doesn't process payments or make deliveries. Kino's role is to help you discover restaurants, browse menus and start the conversation; everything else (payment, preparation, delivery, reservations) is arranged directly with the restaurant.",
  },
  {
    id: "reserve-table",
    question: "How do I reserve a table?",
    answer:
      "You can request a reservation from the Reservations page or a restaurant's profile. Final confirmation, any deposit and table rules are handled by the chosen restaurant.",
  },
  {
    id: "wrong-or-missing-order",
    question: "Something in my order arrived wrong or missing",
    answer:
      "Talk directly to the restaurant through the contact available on the order or restaurant page — they're the ones who prepare and deliver it, so they handle this kind of situation.",
  },
  {
    id: "change-dietary-preferences",
    question: "How do I change my dietary preferences?",
    answer:
      "In Preferences you can choose favorite ingredients and ones that can't be in your dish — we automatically let the restaurant know with every order.",
  },
];
