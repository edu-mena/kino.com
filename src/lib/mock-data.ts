import burger from "@/assets/dish-burger.png";
import fries from "@/assets/dish-fries.png";
import drink from "@/assets/dish-drink.png";
import pizza from "@/assets/dish-pizza.png";
import plate from "@/assets/dish-plate.png";
import dessert from "@/assets/dish-dessert.png";
import restGrill from "@/assets/restaurant-grill.jpg";
import restPizzeria from "@/assets/restaurant-pizzeria.jpg";
import restAngolana from "@/assets/restaurant-angolana.jpg";
import restCafe from "@/assets/restaurant-cafe.jpg";

export const images = { burger, fries, drink, pizza, plate, dessert };

export type AddOn = { id: string; name: string; price: number };

export type Dish = {
  id: string;
  name: string;
  description: string;
  price: number;
  rating: number;
  category: "burgers" | "pizza" | "bebidas" | "pratos" | "sobremesas";
  image: string;
  restaurant: string;
  addOns: AddOn[];
};

export const categories = [
  { id: "burgers", label: "Burgers", image: burger },
  { id: "pizza", label: "Pizza", image: pizza },
  { id: "bebidas", label: "Bebidas", image: drink },
  { id: "pratos", label: "Pratos", image: plate },
  { id: "sobremesas", label: "Sobremesas", image: dessert },
] as const;

const defaultAddOns: AddOn[] = [
  { id: "cheese", name: "Queijo extra", price: 500 },
  { id: "bacon", name: "Bacon", price: 750 },
  { id: "jalapenos", name: "Jalapeños", price: 375 },
];

export const dishes: Dish[] = [
  {
    id: "combo-classico",
    name: "Combo Clássico",
    description:
      "Hambúrguer de vaca suculento com queijo cheddar, alface fresca, tomate, cebola e molho especial. Acompanha batatas e refresco.",
    price: 2500,
    rating: 4.5,
    category: "burgers",
    image: burger,
    restaurant: "Kino Grill",
    addOns: defaultAddOns,
  },
  {
    id: "classic-burger",
    name: "Classic Burger",
    description:
      "Hambúrguer de vaca com queijo cheddar derretido, alface, tomate, cebola e molho da casa.",
    price: 2100,
    rating: 4.6,
    category: "burgers",
    image: burger,
    restaurant: "Kino Grill",
    addOns: defaultAddOns,
  },
  {
    id: "batata-frita",
    name: "Batata Frita",
    description: "Batatas douradas e crocantes, temperadas com sal marinho.",
    price: 900,
    rating: 4.4,
    category: "pratos",
    image: fries,
    restaurant: "Kino Grill",
    addOns: [{ id: "sauce", name: "Molho extra", price: 200 }],
  },
  {
    id: "coca-cola",
    name: "Coca-Cola 500ml",
    description: "Refresco bem gelado, servido com gelo.",
    price: 700,
    rating: 4.7,
    category: "bebidas",
    image: drink,
    restaurant: "Kino Grill",
    addOns: [],
  },
  {
    id: "pizza-pepperoni",
    name: "Pizza Pepperoni",
    description: "Massa fina artesanal, molho de tomate, muito queijo e pepperoni.",
    price: 3200,
    rating: 4.8,
    category: "pizza",
    image: pizza,
    restaurant: "Forno da Ilha",
    addOns: [
      { id: "cheese", name: "Queijo extra", price: 600 },
      { id: "olives", name: "Azeitonas", price: 300 },
    ],
  },
  {
    id: "muamba",
    name: "Frango Grelhado com Arroz",
    description: "Frango grelhado no carvão com arroz temperado e salada fresca.",
    price: 2800,
    rating: 4.9,
    category: "pratos",
    image: plate,
    restaurant: "Sabores de Luanda",
    addOns: [
      { id: "gindungo", name: "Gindungo", price: 150 },
      { id: "salada", name: "Salada extra", price: 400 },
    ],
  },
  {
    id: "bolo-chocolate",
    name: "Bolo de Chocolate",
    description: "Fatia húmida de bolo de chocolate com frutos vermelhos.",
    price: 1500,
    rating: 4.6,
    category: "sobremesas",
    image: dessert,
    restaurant: "Doce Baía",
    addOns: [],
  },
  {
    id: "mega-burger",
    name: "Mega Burger Duplo",
    description: "Dois hambúrgueres, queijo duplo, bacon e molho fumado.",
    price: 3600,
    rating: 4.7,
    category: "burgers",
    image: burger,
    restaurant: "Kino Grill",
    addOns: defaultAddOns,
  },
];

export const restaurants = [
  {
    id: "kino-grill",
    name: "Kino Grill",
    tags: "Burgers · Grelhados",
    rating: 4.7,
    time: "20 - 30 min",
    fee: 700,
    image: restGrill,
  },
  {
    id: "forno-da-ilha",
    name: "Forno da Ilha",
    tags: "Pizza · Italiana",
    rating: 4.8,
    time: "25 - 35 min",
    fee: 900,
    image: restPizzeria,
  },
  {
    id: "sabores-de-luanda",
    name: "Sabores de Luanda",
    tags: "Angolana · Pratos",
    rating: 4.9,
    time: "30 - 45 min",
    fee: 800,
    image: restAngolana,
  },
  {
    id: "doce-baia",
    name: "Doce Baía",
    tags: "Sobremesas · Café",
    rating: 4.6,
    time: "15 - 25 min",
    fee: 500,
    image: restCafe,
  },
];

export const offers = [
  {
    id: "first",
    title: "20% OFF",
    subtitle: "no seu primeiro pedido",
    note: "Use o código: KINO20",
    image: burger,
  },
  {
    id: "delivery",
    title: "Entrega grátis",
    subtitle: "em pedidos acima de AOA 10.000",
    note: "Válido em Luanda",
    image: fries,
  },
  {
    id: "happy",
    title: "Happy Hour",
    subtitle: "15% OFF em todas as bebidas",
    note: "Das 14h às 17h",
    image: drink,
  },
];

export const addresses = [
  { id: "home", label: "Casa", detail: "Rua 1º de Maio, nº 123", area: "Ingombota, Luanda" },
  { id: "work", label: "Trabalho", detail: "Avenida Hoji-Ya-Henda, nº 45", area: "Talatona, Luanda" },
  { id: "uni", label: "Universidade", detail: "Universidade Agostinho Neto", area: "Cacuaco, Luanda" },
];

export const paymentMethods = [
  { id: "visa", label: "Visa Card", detail: "•••• 4242", brand: "VISA" },
  { id: "master", label: "Mastercard", detail: "•••• 5656", brand: "MC" },
  { id: "mpesa", label: "M-Pesa", detail: "•••• 123456", brand: "M-PESA" },
  { id: "unitel", label: "Unitel Money", detail: "•••• 789012", brand: "UNITEL" },
  { id: "bai", label: "Banco BAI Directo", detail: "•••• 3456", brand: "BAI" },
  { id: "cash", label: "Dinheiro na entrega", detail: "Pague quando o pedido chegar", brand: "CASH" },
];

export const trackingSteps = [
  { id: 1, title: "Pedido feito", detail: "O seu pedido foi recebido", time: "12:45", done: true },
  { id: 2, title: "Em preparação", detail: "A cozinha está a preparar", time: "12:50", done: true },
  { id: 3, title: "A caminho", detail: "O estafeta saiu para entrega", time: "13:10", done: true },
  { id: 4, title: "A chegar", detail: "Chega em poucos minutos", time: "—", done: false },
  { id: 5, title: "Entregue", detail: "Bom apetite!", time: "—", done: false },
];

export const helpTopics = [
  "Como fazer um pedido",
  "Métodos de pagamento",
  "Tempo de entrega",
  "Acompanhar o meu pedido",
  "Cancelar o meu pedido",
  "Reembolsos e devoluções",
];

export const formatKz = (value: number) =>
  `AOA ${value.toLocaleString("pt-AO", { maximumFractionDigits: 0 })}`;

export const getDish = (id: string) => dishes.find((d) => d.id === id);

/** Descontos promocionais (em %) por prato. */
export const promoDiscounts: Record<string, number> = {
  "combo-classico": 20,
  "pizza-pepperoni": 15,
  "mega-burger": 25,
  "bolo-chocolate": 10,
  "coca-cola": 30,
};

export const getPromo = (id: string) => promoDiscounts[id];

export const promoPrice = (dish: Dish) => {
  const d = promoDiscounts[dish.id];
  return d ? Math.round((dish.price * (100 - d)) / 100 / 50) * 50 : dish.price;
};

export const promoDishes = dishes.filter((d) => promoDiscounts[d.id]);

/** Lista maior para o grid do cardápio na página inicial. */
export const gridDishes: Dish[] = Array.from(
  { length: 24 },
  (_, i) => dishes[i % dishes.length]!,
);