import {
  Droplet,
  Fish,
  Flame,
  HeartPulse,
  Leaf,
  MilkOff,
  Nut,
  Pill,
  Sprout,
  WheatOff,
  type LucideIcon,
} from "lucide-react";

const MEAT_AND_SEAFOOD = [
  "Asas de Frango",
  "Amêijoa",
  "Atum Fresco",
  "Bacalhau",
  "Bacon",
  "Bacon Extra",
  "Barracuda Fresca",
  "Cabeça de Peixe",
  "Camarão",
  "Camarão Fresco",
  "Camarão Gigante",
  "Carapau Fresco",
  "Carne Moída",
  "Carne Vermelha",
  "Carne de Cabra",
  "Carne de Vaca",
  "Chouriço",
  "Coelho Caçado",
  "Costela Bovina",
  "Costela de Porco",
  "Costeleta de Porco",
  "Defumados",
  "Entrecosto",
  "Frango",
  "Frango Caipira",
  "Frango Desfiado",
  "Frango Fresco",
  "Frango Grelhado",
  "Galinha",
  "Galinha Caipira",
  "Gambas Frescas",
  "Gambas Gigantes",
  "Lagosta Fresca",
  "Linguiça Artesanal",
  "Lula Fresca",
  "Marisco Variado",
  "Meia Franga",
  "Mexilhão",
  "Ossos de Vaca",
  "Ostras Frescas",
  "Peixe Bagre",
  "Peixe Branco",
  "Peixe Branco Fresco",
  "Peixe Fresco",
  "Peixe Grelhado",
  "Peixe Inteiro",
  "Peixe Inteiro Fresco",
  "Peixe Seco",
  "Peixe do Dia",
  "Peixe-Espada",
  "Picanha",
  "Polvo",
  "Salmão Fresco",
  "Salmão Grelhado",
  "Sangue de Frango",
];

const DAIRY_AND_EGGS = [
  "Catupiry",
  "Cream Cheese",
  "Gorgonzola",
  "Manteiga",
  "Manteiga Natural",
  "Manteiga de Alho",
  "Mascarpone",
  "Mozzarella",
  "Mozzarella Fior di Latte",
  "Ovo",
  "Ovo Caipira",
  "Ovo Estrelado",
  "Parmesão",
  "Provolone",
  "Queijo",
  "Queijo Extra",
  "Queijo Meia Cura",
  "Queijo Ralado Extra",
  "Leite Condensado",
  "Leite Natural",
];

const DAIRY_ONLY = DAIRY_AND_EGGS.filter((i) => !i.startsWith("Ovo"));

const SHELLFISH = [
  "Amêijoa",
  "Camarão",
  "Camarão Fresco",
  "Camarão Gigante",
  "Gambas Frescas",
  "Gambas Gigantes",
  "Lagosta Fresca",
  "Lula Fresca",
  "Marisco Variado",
  "Mexilhão",
  "Ostras Frescas",
  "Polvo",
];

const SPICY = [
  "Molho Picante Extra",
  "Molho Piri-Piri",
  "Molho de Malagueta",
  "Molho de Piri",
  "Piri-Piri",
  "Piri-Piri Caseiro",
  "Piripíri",
  "Tempero Piri-Piri",
  "Pimenta Fresca",
];

const GLUTEN = [
  "Massa Crocante",
  "Massa Folhada",
  "Massa Fresca",
  "Massa de Churro",
  "Massa de Coxinha",
  "Massa do Pastel",
  "Noodles",
  "Pão Caseiro",
  "Pão Italiano",
  "Tortilha Quente",
  "Fermento Natural",
];

/**
 * "Pacotes de restrição" — atalhos de um clique pras restrições mais comuns,
 * usados em `/preferencias`, no popup de primeiro acesso
 * (`dietary-onboarding-popup.tsx`) e no atalho dos filtros de pesquisa
 * (`dietary-shortcut-picker.tsx`).
 *
 * O `label` é sempre o texto em português: é o valor guardado em
 * `dietaryRestrictions` e o que viaja com o pedido no checkout — não se
 * traduz (ver README do i18n). `labelKey` é só pra exibição, já traduzida.
 *
 * `conflictIngredients` é uma lista curada à mão (não um filtro por
 * palavra-chave) contra os nomes reais de ingrediente do dataset — evita
 * falsos positivos (ex: "Banana Pão" não é pão de trigo) às custas de
 * precisar de manutenção manual se novos ingredientes conflitantes forem
 * adicionados ao cardápio. É o que liga um pacote (ex: "Vegetariano") ao
 * aviso vermelho num prato — ver `useDishConflicts`.
 *
 * Os 3 pacotes de condição de saúde (Diabetes, Hipertensão, Colesterol
 * alto) ficam de propósito sem `conflictIngredients`: não há como mapear
 * "diabetes" pra uma lista de ingredientes sem julgamento clínico (quase
 * toda sobremesa tem açúcar, quase todo prato salgado tem sal) — o aviso
 * automático erraria demais. Continuam a viajar como texto no checkout,
 * pro restaurante avaliar.
 */
export const RESTRICTION_PACKAGES: {
  label: string;
  labelKey: string;
  icon: LucideIcon;
  conflictIngredients: string[];
}[] = [
  {
    label: "Vegetariano",
    labelKey: "restrictionVegetarian",
    icon: Leaf,
    conflictIngredients: MEAT_AND_SEAFOOD,
  },
  {
    label: "Vegano",
    labelKey: "restrictionVegan",
    icon: Sprout,
    conflictIngredients: [...MEAT_AND_SEAFOOD, ...DAIRY_AND_EGGS],
  },
  {
    label: "Sem glúten",
    labelKey: "restrictionGlutenFree",
    icon: WheatOff,
    conflictIngredients: GLUTEN,
  },
  {
    label: "Sem lactose",
    labelKey: "restrictionLactoseFree",
    icon: MilkOff,
    conflictIngredients: DAIRY_ONLY,
  },
  {
    label: "Sem amendoim",
    labelKey: "restrictionPeanutFree",
    icon: Nut,
    conflictIngredients: ["Amendoim"],
  },
  {
    label: "Sem marisco",
    labelKey: "restrictionShellfishFree",
    icon: Fish,
    conflictIngredients: SHELLFISH,
  },
  {
    label: "Sem picante",
    labelKey: "restrictionSpicyFree",
    icon: Flame,
    conflictIngredients: SPICY,
  },
  { label: "Diabetes", labelKey: "restrictionDiabetes", icon: Droplet, conflictIngredients: [] },
  {
    label: "Hipertensão",
    labelKey: "restrictionHypertension",
    icon: HeartPulse,
    conflictIngredients: [],
  },
  {
    label: "Colesterol alto",
    labelKey: "restrictionHighCholesterol",
    icon: Pill,
    conflictIngredients: [],
  },
] as const;

export const RESTRICTION_PACKAGE_LABELS: string[] = RESTRICTION_PACKAGES.map((r) => r.label);

/** Ingredientes que conflitam com os pacotes de restrição activos (ex:
 * "Vegetariano" ligado → todos os ingredientes de carne/peixe/marisco) —
 * usada junto com `excludedIngredients` (a lista livre) pra decidir se um
 * prato mostra o aviso vermelho. Ver `useDishConflicts`. */
export function getPackageConflictIngredients(dietaryRestrictions: string[]): string[] {
  const active = RESTRICTION_PACKAGES.filter((p) => dietaryRestrictions.includes(p.label));
  return [...new Set(active.flatMap((p) => p.conflictIngredients))];
}
