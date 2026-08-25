import type { HelpArticle } from "./index";

/** Français — suit exactement les mêmes `id`s (et ordre) que `pt.ts`. */
export const helpArticlesFr: HelpArticle[] = [
  {
    id: "how-to-order",
    question: "Comment passer une commande ?",
    answer:
      "Chaque restaurant a ses propres règles pour les commandes à emporter, la planification des plats et les réservations de table. Ces règles sont visibles sur la page du restaurant choisi, avant de finaliser la commande.",
  },
  {
    id: "how-to-pay",
    question: "Comment fonctionnent les paiements ?",
    answer:
      "Kino.com ne reçoit pas les paiements directement des clients — elle facilite seulement la mise en relation entre clients et restaurants. Le paiement est convenu directement avec le restaurant choisi.",
  },
  {
    id: "delivery-time",
    question: "Quel est le délai de livraison ?",
    answer:
      "Le délai de livraison est défini et géré par le restaurant lui-même, selon votre localisation et la disponibilité au moment de la commande.",
  },
  {
    id: "track-order",
    question: "Comment suivre ma commande ?",
    answer: "Le suivi de la commande se fait directement avec le restaurant choisi.",
  },
  {
    id: "cancel-order",
    question: "Comment annuler ma commande ?",
    answer:
      "L'annulation suit les règles indiquées par le restaurant — contactez-le directement dès que possible.",
  },
  {
    id: "refunds",
    question: "Comment fonctionnent les remboursements et retours ?",
    answer:
      "Les remboursements et retours sont traités directement avec le restaurant, comme les annulations.",
  },
  {
    id: "how-kino-works",
    question: "Comment fonctionne Kino.com ?",
    answer:
      "Kino.com est une plateforme qui met en relation clients et restaurants de Luanda — elle ne traite pas les paiements ni ne fait de livraisons. Le rôle de Kino est d'aider à découvrir des restaurants, consulter les menus et lancer le contact ; tout le reste (paiement, préparation, livraison, réservation) est convenu directement avec le restaurant.",
  },
  {
    id: "reserve-table",
    question: "Comment réserver une table ?",
    answer:
      "Vous pouvez demander une réservation depuis la page Réservations ou le profil d'un restaurant. La confirmation finale, un éventuel acompte et les règles de la table relèvent du restaurant choisi.",
  },
  {
    id: "wrong-or-missing-order",
    question: "Un élément de ma commande est arrivé incorrect ou manquant",
    answer:
      "Parlez directement au restaurant via le contact disponible sur la page de la commande ou du restaurant — c'est lui qui prépare et livre, donc il gère ce type de situation.",
  },
  {
    id: "change-dietary-preferences",
    question: "Comment modifier mes préférences alimentaires ?",
    answer:
      "Dans Préférences, vous pouvez choisir des ingrédients favoris et des ingrédients qui ne peuvent pas figurer dans le plat — nous prévenons automatiquement le restaurant à chaque commande.",
  },
];
