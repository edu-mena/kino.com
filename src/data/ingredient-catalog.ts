/**
 * Catálogo curado de ~200 ingredientes comuns em restaurantes angolanos —
 * usado só como lista de SUGESTÕES na entrada de ingredientes do cardápio
 * (ver `SearchableSelect` em `admin.cardapio.tsx`/`dish-form-dialog.tsx`).
 * Não é uma validação: um prato pode ter (e já tem, em pratos existentes)
 * ingredientes em texto livre fora desta lista — a entrada continua a
 * aceitar qualquer texto, isto só acelera o caso comum.
 *
 * Organizado por categoria só para facilitar manutenção deste ficheiro; o
 * componente que consome isto recebe a lista já achatada (`INGREDIENT_CATALOG`).
 * Nomes em português, Title Case — mesma convenção de `dietary-packages.ts`.
 */

const PROTEINS = [
  "Asas de Frango",
  "Atum Fresco",
  "Bacalhau",
  "Bacon",
  "Barracuda Fresca",
  "Camarão",
  "Camarão Fresco",
  "Camarão Gigante",
  "Carapau Fresco",
  "Carne Moída",
  "Carne de Cabra",
  "Carne de Vaca",
  "Chouriço",
  "Costela Bovina",
  "Costela de Porco",
  "Costeleta de Porco",
  "Entrecosto",
  "Frango",
  "Frango Desfiado",
  "Frango Grelhado",
  "Galinha",
  "Galinha Caipira",
  "Gambas Frescas",
  "Lagosta Fresca",
  "Linguiça Artesanal",
  "Lula Fresca",
  "Marisco Variado",
  "Mexilhão",
  "Ovo",
  "Ovo Estrelado",
  "Ostras Frescas",
  "Peixe Bagre",
  "Peixe Branco",
  "Peixe Fresco",
  "Peixe Seco",
  "Peixe-Espada",
  "Picanha",
  "Polvo",
  "Presunto",
  "Salame",
  "Salmão Fresco",
  "Salsicha",
];

const DAIRY = [
  "Catupiry",
  "Cream Cheese",
  "Gorgonzola",
  "Iogurte Natural",
  "Leite Condensado",
  "Leite Natural",
  "Manteiga",
  "Manteiga de Alho",
  "Mascarpone",
  "Mozzarella",
  "Natas",
  "Parmesão",
  "Provolone",
  "Queijo",
  "Queijo Fresco",
  "Queijo Ralado",
];

const VEGETABLES = [
  "Abóbora",
  "Abobrinha",
  "Alface",
  "Alho",
  "Alho Francês",
  "Batata",
  "Batata Doce",
  "Beringela",
  "Beterraba",
  "Brócolos",
  "Cebola",
  "Cebola Roxa",
  "Cenoura",
  "Cogumelos",
  "Couve",
  "Couve-Flor",
  "Espinafre",
  "Feijão Verde",
  "Gengibre",
  "Milho",
  "Pepino",
  "Pimento Verde",
  "Pimento Vermelho",
  "Quiabo",
  "Repolho",
  "Rúcula",
  "Tomate",
  "Tomate Cherry",
];

const FRUITS = [
  "Abacate",
  "Abacaxi",
  "Ananás",
  "Banana",
  "Banana Pão",
  "Coco",
  "Kiwi",
  "Laranja",
  "Limão",
  "Maçã",
  "Manga",
  "Maracujá",
  "Melancia",
  "Morango",
  "Papaia",
  "Uva",
];

const GRAINS_AND_STARCHES = [
  "Arroz",
  "Arroz Basmati",
  "Farinha de Milho",
  "Farinha de Trigo",
  "Feijão Branco",
  "Feijão Preto",
  "Feijão Vermelho",
  "Fuba",
  "Funge",
  "Macaroni",
  "Massa",
  "Massa Esparguete",
  "Massa Fresca",
  "Noodles",
  "Pão",
  "Pão Caseiro",
  "Pão de Milho",
  "Pipoca",
  "Quinoa",
  "Tortilha",
];

const HERBS_AND_SPICES = [
  "Alecrim",
  "Canela",
  "Coentros",
  "Colorau",
  "Cominhos",
  "Cravinho",
  "Curcuma",
  "Louro",
  "Malagueta",
  "Noz-Moscada",
  "Orégãos",
  "Paprika",
  "Pimenta Preta",
  "Piri-Piri",
  "Salsa",
  "Tomilho",
];

const SAUCES_AND_CONDIMENTS = [
  "Azeite",
  "Azeite Extra Virgem",
  "Azeitonas",
  "Ketchup",
  "Maionese",
  "Molho Barbecue",
  "Molho Branco",
  "Molho Piri-Piri",
  "Molho Soja",
  "Molho de Alho",
  "Molho de Tomate",
  "Mostarda",
  "Óleo de Amendoim",
  "Óleo de Girassol",
  "Óleo de Palma (Dendém)",
  "Vinagre",
  "Vinagrete",
];

const NUTS_AND_LEGUMES = [
  "Amendoim",
  "Amêndoas",
  "Castanha de Caju",
  "Ervilhas",
  "Grão-de-Bico",
  "Lentilhas",
];

const PANTRY_AND_SWEETS = [
  "Açúcar",
  "Baunilha",
  "Canela em Pó",
  "Chocolate",
  "Chocolate em Pó",
  "Cravo",
  "Fermento",
  "Mel",
  "Sal",
  "Sumo de Limão",
];

const BEVERAGES = ["Café", "Chá", "Sumo Natural", "Água com Gás"];

const ANGOLAN_STAPLES = [
  "Calulu",
  "Farofa",
  "Feijão de Óleo de Palma",
  "Funge de Bombó",
  "Gindungo",
  "Jindungo Seco",
  "Kizaca",
  "Mandioca",
  "Muamba",
  "Óleo de Palma",
  "Pirão",
];

/** Lista achatada e sem duplicados — o que o componente de pesquisa
 * consome de facto. As sub-listas acima existem só para organizar este
 * ficheiro por categoria, mais fácil de manter/rever. */
export const INGREDIENT_CATALOG: string[] = [
  ...new Set([
    ...PROTEINS,
    ...DAIRY,
    ...VEGETABLES,
    ...FRUITS,
    ...GRAINS_AND_STARCHES,
    ...HERBS_AND_SPICES,
    ...SAUCES_AND_CONDIMENTS,
    ...NUTS_AND_LEGUMES,
    ...PANTRY_AND_SWEETS,
    ...BEVERAGES,
    ...ANGOLAN_STAPLES,
  ]),
].sort((a, b) => a.localeCompare(b, "pt"));
