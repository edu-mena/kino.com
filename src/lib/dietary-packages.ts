import { Fish, Flame, Leaf, MilkOff, Nut, Sprout, WheatOff, type LucideIcon } from "lucide-react";

/**
 * "Pacotes de restrição" — atalhos de um clique pras restrições mais comuns,
 * usados em `/preferencias` e no popup de primeiro acesso
 * (`dietary-onboarding-popup.tsx`).
 *
 * O `label` é sempre o texto em português: é o valor guardado em
 * `dietaryRestrictions` e o que viaja com o pedido no checkout — não se
 * traduz (ver README do i18n). `labelKey` é só pra exibição, já traduzida.
 */
export const RESTRICTION_PACKAGES: { label: string; labelKey: string; icon: LucideIcon }[] = [
  { label: "Vegetariano", labelKey: "restrictionVegetarian", icon: Leaf },
  { label: "Vegano", labelKey: "restrictionVegan", icon: Sprout },
  { label: "Sem glúten", labelKey: "restrictionGlutenFree", icon: WheatOff },
  { label: "Sem lactose", labelKey: "restrictionLactoseFree", icon: MilkOff },
  { label: "Sem amendoim", labelKey: "restrictionPeanutFree", icon: Nut },
  { label: "Sem marisco", labelKey: "restrictionShellfishFree", icon: Fish },
  { label: "Sem picante", labelKey: "restrictionSpicyFree", icon: Flame },
] as const;

export const RESTRICTION_PACKAGE_LABELS: string[] = RESTRICTION_PACKAGES.map((r) => r.label);
