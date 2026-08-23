const perfilAvatar = "https://i.pravatar.cc/150?img=12";

import {
  Restaurant,
  MenuItem,
  Reservation,
  DeliveryOrder,
  Review,
  RegisteredCustomer,
  UserProfile,
  SavedAddress,
  Offer,
  RestaurantStory,
} from "./types";

export const INITIAL_RESTAURANTS: Restaurant[] = [
  // RESTAURANTES PREMIUM
  {
    id: "rest-1",
    name: "Bistrô Sabor & Arte",
    description:
      "Gastronomia contemporânea com inspiração angolana e internacional. Pratos elaborados com ingredientes frescos locais em ambiente acolhedor.",
    cuisine: "Angolana / Típica",
    priceLevel: "Kz Kz Kz",
    rating: 4.9,
    reviewCount: 128,
    distanceKm: 1.2,
    address: "Avenida 4 de Fevereiro, Marginal de Luanda",
    neighborhood: "Marginal",
    city: "Luanda",
    phone: "+244 923 456 789",
    email: "contacto@saborearte.ao",
    openingHours: "12:00 - 23:00 (Ter - Dom)",
    coverImage:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1200&auto=format&fit=crop",
    galleryImages: [
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=800&auto=format&fit=crop",
    ],
    isDeliveryAvailable: true,
    deliveryZones: ["Marginal", "Ingombota", "Maianga", "Maculusso"],
    deliveryFee: 1500,
    estimatedDeliveryMinutes: 35,
    cautionAmount: 2000,
    cautionPolicyNotice: "Caução estornada integralmente mediante comparência no horário agendado.",
    isFeatured: true,
  },
  {
    id: "rest-2",
    name: "O Marisqueiro da Ilha",
    description:
      "Especialista em marisco fresco da costa angolana. Lagosta grelhada, gambas ao alho e caldeirada de peixe com vista panorâmica para o mar.",
    cuisine: "Marisqueira",
    priceLevel: "Kz Kz Kz Kz",
    rating: 4.8,
    reviewCount: 210,
    distanceKm: 2.8,
    address: "Avenida Murtala Mohamed, nº 45",
    neighborhood: "Ilha de Luanda",
    city: "Luanda",
    phone: "+244 912 345 678",
    email: "reservas@marisqueiroilha.ao",
    openingHours: "12:00 - 00:00 (Todos os dias)",
    coverImage:
      "https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=1200&auto=format&fit=crop",
    galleryImages: [
      "https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?q=80&w=800&auto=format&fit=crop",
    ],
    // Marisqueira premium — só serve à mesa, sem entrega em nenhuma área.
    isDeliveryAvailable: false,
    deliveryFee: 2000,
    estimatedDeliveryMinutes: 45,
    cautionAmount: 3000,
    cautionPolicyNotice:
      "Caução de reserva para garantia de mesa. Valor deduzido ou estornado na conta final.",
    isFeatured: true,
  },
  {
    id: "rest-3",
    name: "Mamma Mia Ristorante",
    description:
      "Autêntica culinária italiana com massas artesanais preparadas diariamente, pizzas no forno a lenha e carta de vinhos selecionada.",
    cuisine: "Italiana",
    priceLevel: "Kz Kz Kz",
    rating: 4.7,
    reviewCount: 94,
    distanceKm: 4.1,
    address: "Rua Major Kanhangulo, Miramar",
    neighborhood: "Miramar",
    city: "Luanda",
    phone: "+244 934 567 890",
    email: "ciao@mammamia.ao",
    openingHours: "18:30 - 23:30 (Seg - Sáb)",
    coverImage:
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1200&auto=format&fit=crop",
    galleryImages: [
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1579684947550-22e945225d9a?q=80&w=800&auto=format&fit=crop",
    ],
    isDeliveryAvailable: true,
    deliveryZones: ["Miramar", "Ingombota"],
    deliveryFee: 1800,
    estimatedDeliveryMinutes: 40,
    cautionAmount: 2000,
    cautionPolicyNotice:
      "Caução estornada em até 24h caso o cancelamento ocorra com 2h de antecedência.",
    isFeatured: false,
  },
  {
    id: "rest-4",
    name: "Talatona Grill & Churrascaria",
    description:
      "O melhor rodízio e cortes de carne nobre grelhados na brasa, servidos com banana pão frita, farofa temperada e molhos artesanais.",
    cuisine: "Grelhados",
    priceLevel: "Kz Kz Kz",
    rating: 4.6,
    reviewCount: 165,
    distanceKm: 8.5,
    address: "Via AL15, Complexo Talatona Plaza",
    neighborhood: "Talatona",
    city: "Luanda",
    phone: "+244 945 678 901",
    email: "atendimento@talatongrill.ao",
    openingHours: "12:00 - 23:00 (Ter - Dom)",
    coverImage:
      "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1200&auto=format&fit=crop",
    galleryImages: [
      "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=800&auto=format&fit=crop",
    ],
    isDeliveryAvailable: false,
    deliveryFee: 2500,
    estimatedDeliveryMinutes: 50,
    cautionAmount: 2500,
    cautionPolicyNotice: "Garantia de reserva de mesa em horário de pico.",
    isFeatured: false,
  },
  {
    id: "rest-5",
    name: "Sakura Sushi Lounge",
    description:
      "Experiência gastronómica japonesa com peixe fresco selecionado, combinados especiais, temakis e ambiente intimista refinado.",
    cuisine: "Japonês",
    priceLevel: "Kz Kz Kz Kz",
    rating: 4.9,
    reviewCount: 82,
    distanceKm: 3.5,
    address: "Rua Rainha Ginga, Baixa de Luanda",
    neighborhood: "Maianga",
    city: "Luanda",
    phone: "+244 928 901 234",
    email: "contacto@sakurasushi.ao",
    openingHours: "19:00 - 00:00 (Ter - Dom)",
    coverImage:
      "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=80&w=1200&auto=format&fit=crop",
    galleryImages: [
      "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=80&w=800&auto=format&fit=crop",
    ],
    // Lounge intimista — reservas e caução fazem sentido, entrega não; sem
    // cobertura de entrega em nenhuma área.
    isDeliveryAvailable: false,
    deliveryFee: 2200,
    estimatedDeliveryMinutes: 40,
    cautionAmount: 3000,
    cautionPolicyNotice: "Caução estornada mediante apresentação do voucher no restaurante.",
    isFeatured: true,
  },
  {
    id: "rest-6",
    name: "Tasca do Zé da Muamba",
    description:
      "Restaurante rústico angolano tradicional. Autêntica comida caseira com receitas passadas de geração em geração. O melhor da culinária de rua refinada.",
    cuisine: "Angolana Tradicional",
    priceLevel: "Kz Kz",
    rating: 4.8,
    reviewCount: 342,
    distanceKm: 0.8,
    address: "Rua da Liberdade, nº 123, Kinaxixe",
    neighborhood: "Kinaxixe",
    city: "Luanda",
    phone: "+244 918 765 432",
    email: "tasca.zé@Angola.com",
    openingHours: "11:00 - 22:00 (Todos os dias)",
    coverImage:
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1200&auto=format&fit=crop",
    galleryImages: [
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop",
    ],
    isDeliveryAvailable: true,
    deliveryZones: ["Kinaxixe", "Alvalade"],
    deliveryFee: 800,
    estimatedDeliveryMinutes: 20,
    cautionAmount: 1000,
    cautionPolicyNotice: "Sem caução. Comida fresca preparada na hora.",
    isFeatured: true,
  },
  {
    id: "rest-7",
    name: "Restaurante Tempero Angolano",
    description:
      "Casa especializada em pratos tradicionais de toda Angola. De Luanda ao Cuanza, provamos a variedade do país numa mesa.",
    cuisine: "Angolana Regional",
    priceLevel: "Kz Kz",
    rating: 4.7,
    reviewCount: 256,
    distanceKm: 2.3,
    address: "Avenida Deolinda Rodrigues, Alvalade",
    neighborhood: "Alvalade",
    city: "Luanda",
    phone: "+244 927 654 321",
    email: "tempero@restaurante.ao",
    openingHours: "12:00 - 22:00 (Ter - Dom)",
    coverImage:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1200&auto=format&fit=crop",
    galleryImages: [
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=800&auto=format&fit=crop",
    ],
    isDeliveryAvailable: true,
    deliveryFee: 1200,
    estimatedDeliveryMinutes: 30,
    cautionAmount: 1500,
    cautionPolicyNotice: "Caução reembolsável para garantia de hora.",
    isFeatured: true,
  },
  {
    id: "rest-8",
    name: "Peixaria & Grelhados Benilson",
    description:
      "Especialidade em peixe fresco grelhado na hora. Barracuda, tubarão, carapau, peixe-espada. Simples, saboroso e pura tradição.",
    cuisine: "Peixaria / Grelhados",
    priceLevel: "Kz Kz",
    rating: 4.9,
    reviewCount: 198,
    distanceKm: 1.5,
    address: "Rua 17 de Setembro, Sambizanga",
    neighborhood: "Sambizanga",
    city: "Luanda",
    phone: "+244 922 111 333",
    email: "benilson.peixaria@mail.ao",
    openingHours: "10:00 - 20:00 (Seg - Sáb)",
    coverImage:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTzNRIC01v4_Mh1K6sBkxLLCFC0muvTClpEZ3wA4sg9NA&s=10",
    galleryImages: [
      "https://images.unsplash.com/photo-1559827260-dc66d52bef19?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1504674900949-f4e0591411ab?q=80&w=800&auto=format&fit=crop",
    ],
    isDeliveryAvailable: true,
    deliveryFee: 1000,
    estimatedDeliveryMinutes: 25,
    cautionAmount: 800,
    cautionPolicyNotice: "Sem caução. Peixe fresco do dia.",
    isFeatured: false,
  },
  {
    id: "rest-9",
    name: "Casa da Cachupa Premium",
    description:
      "Cachupa de todas as formas: com ovo frito, com queijo, com peixe. A especialidade é a Cachupa Miúda cremosa, receita da avó Florinda.",
    cuisine: "Cachupa / Típica",
    priceLevel: "Kz",
    rating: 4.8,
    reviewCount: 425,
    distanceKm: 3.2,
    address: "Rua Ngola Kiluanji, Cazenga",
    neighborhood: "Cazenga",
    city: "Luanda",
    phone: "+244 913 222 444",
    email: "cachupahouse@hotmail.ao",
    openingHours: "06:30 - 21:00 (Todos os dias)",
    coverImage:
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1200&auto=format&fit=crop",
    galleryImages: [
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop",
    ],
    isDeliveryAvailable: true,
    deliveryZones: ["Cazenga", "Sambizanga"],
    deliveryFee: 600,
    estimatedDeliveryMinutes: 15,
    cautionAmount: 500,
    cautionPolicyNotice: "Preparo rápido. Cachupa quentinha na sua porta.",
    isFeatured: true,
  },
  {
    id: "rest-10",
    name: "Fogo & Brasa - Frango Assado",
    description:
      "Frango assado à angolana com molho piri-piri caseiro. Acompanhado com arroz de milho e salada fresca. Comida de boteco de qualidade.",
    cuisine: "Frango Assado",
    priceLevel: "Kz Kz",
    rating: 4.7,
    reviewCount: 312,
    distanceKm: 1.8,
    address: "Avenida Comandante Gika, Maianga",
    neighborhood: "Maianga",
    city: "Luanda",
    phone: "+244 924 333 555",
    email: "fogoebrasa@mail.ao",
    openingHours: "11:00 - 23:00 (Todos os dias)",
    coverImage:
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1200&auto=format&fit=crop",
    galleryImages: [
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop",
    ],
    isDeliveryAvailable: true,
    deliveryFee: 900,
    estimatedDeliveryMinutes: 20,
    cautionAmount: 700,
    cautionPolicyNotice: "Frango quentinho, sem espera.",
    isFeatured: true,
  },
  {
    id: "rest-11",
    name: "Restaurante Raízes de Angola",
    description:
      "Comida de avó, feita com amor. Moamba, Matamba, Caldeirada. Ingredientes naturais, sem conservantes, receitas centenárias.",
    cuisine: "Angolana Caseira",
    priceLevel: "Kz Kz",
    rating: 4.9,
    reviewCount: 287,
    distanceKm: 2.6,
    address: "Rua Dr. António Agostinho Neto, Maculusso",
    neighborhood: "Maculusso",
    city: "Luanda",
    phone: "+244 926 444 666",
    email: "raizes.angola@mail.ao",
    openingHours: "12:00 - 23:00 (Todos os dias)",
    coverImage:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1200&auto=format&fit=crop",
    galleryImages: [
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=800&auto=format&fit=crop",
    ],
    isDeliveryAvailable: true,
    deliveryFee: 1100,
    estimatedDeliveryMinutes: 25,
    cautionAmount: 1200,
    cautionPolicyNotice: "Comida fresca da hora. Sem aditivos.",
    isFeatured: true,
  },
  {
    id: "rest-12",
    name: "Mercadoria Pura - Boteco Angolano",
    description:
      "Ambiente despretensioso, comida genuína. Caldeirada, Peixe à Luanda, Feijoada à Angolana e bebidas refrescantes.",
    cuisine: "Boteco / Típica",
    priceLevel: "Kz",
    rating: 4.6,
    reviewCount: 267,
    distanceKm: 2.1,
    address: "Rua Lúcio Lara, Ingombota",
    neighborhood: "Ingombota",
    city: "Luanda",
    phone: "+244 911 555 777",
    email: "mercadoriaapura@hotmail.ao",
    openingHours: "10:00 - 22:00 (Seg - Dom)",
    coverImage:
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop",
    galleryImages: [
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop",
    ],
    isDeliveryAvailable: true,
    deliveryFee: 750,
    estimatedDeliveryMinutes: 18,
    cautionAmount: 600,
    cautionPolicyNotice: "Entrega rápida, comida quentinha.",
    isFeatured: false,
  },
  {
    id: "rest-13",
    name: "Matamba & Moamba Express",
    description:
      "Especialidade em pratos de cuisson lenta. Matamba de banana verde, Moamba cremosa. Servido quente na tradição angolana.",
    cuisine: "Pratos de Cuisson",
    priceLevel: "Kz Kz",
    rating: 4.8,
    reviewCount: 198,
    distanceKm: 3.8,
    address: "Avenida 4 de Fevereiro, Kinaxixe",
    neighborhood: "Kinaxixe",
    city: "Luanda",
    phone: "+244 929 666 888",
    email: "matamba.express@mail.ao",
    openingHours: "11:00 - 22:00 (Todos os dias)",
    coverImage:
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop",
    galleryImages: [
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop",
    ],
    isDeliveryAvailable: true,
    deliveryFee: 1100,
    estimatedDeliveryMinutes: 30,
    cautionAmount: 1300,
    cautionPolicyNotice: "Prato confortante, receita de gerações.",
    isFeatured: false,
  },
  {
    id: "rest-14",
    name: "Arroz de Marisco da Costera",
    description:
      "Marisco fresco em arroz cremoso. Combinação perfeita de camarão, lula, amêijoa e peixe branco em caldo aromático.",
    cuisine: "Arroz de Marisco",
    priceLevel: "Kz Kz Kz",
    rating: 4.9,
    reviewCount: 156,
    distanceKm: 4.2,
    address: "Avenida Murtala Mohamed, Mossâmedes",
    neighborhood: "Ilha de Luanda",
    city: "Luanda",
    phone: "+244 914 777 999",
    email: "arrozmarisco@mail.ao",
    openingHours: "12:00 - 23:00 (Todos os dias)",
    coverImage:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTzNRIC01v4_Mh1K6sBkxLLCFC0muvTClpEZ3wA4sg9NA&s=10",
    galleryImages: [
      "https://images.unsplash.com/photo-1559827260-dc66d52bef19?q=80&w=800&auto=format&fit=crop",
    ],
    isDeliveryAvailable: true,
    deliveryFee: 1800,
    estimatedDeliveryMinutes: 35,
    cautionAmount: 2000,
    cautionPolicyNotice: "Marisco do dia. Qualidade garantida.",
    isFeatured: true,
  },
  {
    id: "rest-15",
    name: "Prato Rápido & Snacks",
    description:
      "Fast-food angolano com comida rápida e saborosa. Fahita, Franguité, Cabrité, Pinchos e muito mais. Comida de rua refinada.",
    cuisine: "Snacks",
    priceLevel: "Kz Kz",
    rating: 4.6,
    reviewCount: 445,
    distanceKm: 1.5,
    address: "Rua da Sagrada Família, Kinaxixe",
    neighborhood: "Kinaxixe",
    city: "Luanda",
    phone: "+244 921 999 888",
    email: "pratosrapidos@mail.ao",
    openingHours: "10:00 - 00:00 (Todos os dias)",
    coverImage:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1200&auto=format&fit=crop",
    galleryImages: [
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=800&auto=format&fit=crop",
    ],
    isDeliveryAvailable: true,
    deliveryFee: 600,
    estimatedDeliveryMinutes: 15,
    cautionAmount: 500,
    cautionPolicyNotice: "Entrega rápida. Comida quentinha garantida.",
    isFeatured: true,
  },
];

export const INITIAL_MENU_ITEMS: MenuItem[] = [
  // ===== BISTRÔ SABOR & ARTE (rest-1) =====
  {
    id: "menu-101",
    restaurantId: "rest-1",
    name: "Moamba de Galinha Tradicional da Avó",
    description:
      "Galinha caipira cozinhada 2 horas em óleo de palma puro com quiabos tenros. Receita autêntica passada de geração em geração.",
    price: 8500,
    category: "Pratos Principais",
    image:
      "https://cookkudia.com/wp-content/uploads/2025/09/cookkudia_cozinha_angolana_moambagalinha.jpg",
    isAvailable: true,
    portionInfo: "Servido para 1 a 2 pessoas",
    prepTimeMinutes: 20,
    isPromoted: true,
    promotionLabel: "Mais Pedido da Casa",
    orderCount: 420,
    isTrending: true,
    ingredients: [
      { id: "ing-101", name: "Galinha Caipira", removable: false },
      { id: "ing-102", name: "Óleo de Palma", removable: false },
      { id: "ing-103", name: "Quiabos Frescos", removable: true },
      { id: "ing-104", name: "Funge de Milho", removable: true },
    ],
  },
  {
    id: "menu-102",
    restaurantId: "rest-1",
    name: "Funge com Calulu de Peixe",
    description:
      "Funge de milho macio acompanhado com calulu de peixe fresco em caldo aromático de tomate e especiarias angolanas.",
    price: 7800,
    category: "Pratos Principais",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Calulu.jpg/250px-Calulu.jpg",
    isAvailable: true,
    portionInfo: "Para 2 pessoas",
    prepTimeMinutes: 25,
    ingredients: [
      { id: "ing-105", name: "Peixe Branco Fresco", removable: false },
      { id: "ing-106", name: "Tomate Natural", removable: true },
      { id: "ing-107", name: "Cebola", removable: true },
    ],
  },
  {
    id: "menu-103",
    restaurantId: "rest-1",
    name: "Fúnbua com Mombó e Carne",
    description:
      "Fúnbua cremosa de banana verde ralada com mombó fresco e carne moída ao tempero. Prato rústico e reconfortante.",
    price: 6500,
    category: "Pratos Principais",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQteyXRzxbrmOeJFa4FlQ-yX39jG4GUNr9uBOAtxuNkrsoUYPRMm-u-hBQ&s=10",
    isAvailable: true,
    portionInfo: "Prato individual farto",
    prepTimeMinutes: 20,
    ingredients: [
      { id: "ing-108", name: "Banana Verde", removable: false },
      { id: "ing-109", name: "Carne Moída", removable: false },
      { id: "ing-110", name: "Mombó Fresco", removable: true },
    ],
  },
  {
    id: "menu-104",
    restaurantId: "rest-1",
    name: "Feijão de Óleo de Palma",
    description:
      "Feijão preto cozido em óleo de palma puro com caldo de cebola e alho. Prato que alimenta a alma angolana.",
    price: 4500,
    category: "Pratos Principais",
    image:
      "https://cookkudia.com/wp-content/uploads/2025/09/cookkudia_cozinha_angolana_feijaodeoleodepalma.jpg",
    isAvailable: true,
    portionInfo: "Acompanhado com arroz ou funge",
    prepTimeMinutes: 15,
    ingredients: [
      { id: "ing-111", name: "Feijão Preto", removable: false },
      { id: "ing-112", name: "Óleo de Palma", removable: true },
    ],
  },
  {
    id: "menu-105",
    restaurantId: "rest-1",
    name: "Funge com Feijão e Calulu de Frango",
    description:
      "Funge de milho macio acompanhado com feijão cozido e calulu cremoso de frango. Prato tradicional e nutritivo.",
    price: 3500,
    category: "Pequeno-Almoço",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTdUmlMmh9ZMkFoP55LnzaEMCkMFQ1HMbi2NqNFVrymzRdkUfrO_1l0lGA&s=10",
    isAvailable: true,
    portionInfo: "Prato generoso",
    prepTimeMinutes: 10,
    ingredients: [
      { id: "ing-113", name: "Funge de Milho", removable: false },
      { id: "ing-114", name: "Frango Desfiado", removable: true },
      { id: "ing-115", name: "Feijão Cozido", removable: true },
    ],
  },
  {
    id: "menu-106",
    restaurantId: "rest-1",
    name: "Fúmbua Tradicional",
    description:
      "Milho moído em caldo cremoso com peixe seco ou carne. Prato tradicional angolano de confere conforto e sabor.",
    price: 3800,
    category: "Pequeno-Almoço",
    image: "https://cookkudia.com/wp-content/uploads/2025/09/cookkudia_cozinha_angolana_fumbua.jpg",
    isAvailable: true,
    portionInfo: "Tigela generosa",
    prepTimeMinutes: 15,
    ingredients: [
      { id: "ing-116", name: "Milho Moído", removable: false },
      { id: "ing-117", name: "Peixe Seco", removable: true },
      { id: "ing-118", name: "Caldo Aromático", removable: true },
    ],
  },

  // ===== O MARISQUEIRO DA ILHA (rest-2) — Marisqueira =====
  {
    id: "menu-201",
    restaurantId: "rest-2",
    name: "Lagosta Grelhada com Manteiga de Alho",
    description:
      "Lagosta fresca da costa angolana, grelhada e regada com manteiga de alho e ervas. O prato mais pedido da casa.",
    price: 22000,
    category: "Pratos Principais",
    image:
      "https://images.unsplash.com/photo-1559737558-2f5a35f4523b?q=80&w=800&auto=format&fit=crop",
    isAvailable: true,
    portionInfo: "Lagosta inteira ± 500g",
    prepTimeMinutes: 30,
    isPromoted: true,
    promotionLabel: "Mais Pedido da Casa",
    orderCount: 265,
    ingredients: [
      { id: "ing-201", name: "Lagosta Fresca", removable: false },
      { id: "ing-202", name: "Manteiga de Alho", removable: true },
      { id: "ing-203", name: "Ervas Frescas", removable: true },
      { id: "ing-204", name: "Limão", removable: true },
    ],
  },
  {
    id: "menu-202",
    restaurantId: "rest-2",
    name: "Gambas ao Alho e Piri-Piri",
    description:
      "Gambas grandes salteadas em azeite, alho e piri-piri, servidas com pão para molhar no molho.",
    price: 9800,
    category: "Pratos Principais",
    image:
      "https://images.unsplash.com/photo-1565895405138-6c3a1555da6a?q=80&w=800&auto=format&fit=crop",
    isAvailable: true,
    portionInfo: "Porção de 350g",
    prepTimeMinutes: 18,
    ingredients: [
      { id: "ing-205", name: "Gambas Frescas", removable: false },
      { id: "ing-206", name: "Alho", removable: true },
      { id: "ing-207", name: "Piri-Piri", removable: true },
    ],
  },
  {
    id: "menu-203",
    restaurantId: "rest-2",
    name: "Caldeirada de Peixe e Marisco",
    description:
      "Caldeirada farta com peixe do dia, camarão e amêijoa em caldo aromático de tomate e coentros.",
    price: 13500,
    category: "Pratos Principais",
    image:
      "https://images.unsplash.com/photo-1559847844-5315695dadae?q=80&w=800&auto=format&fit=crop",
    isAvailable: true,
    portionInfo: "Para 2 pessoas",
    prepTimeMinutes: 35,
    ingredients: [
      { id: "ing-208", name: "Peixe do Dia", removable: false },
      { id: "ing-209", name: "Camarão", removable: false },
      { id: "ing-210", name: "Amêijoa", removable: true },
    ],
  },
  {
    id: "menu-204",
    restaurantId: "rest-2",
    name: "Polvo à Lagareiro",
    description:
      "Polvo tenro assado em azeite, alho e batata a murro. Clássico do mar servido bem quente.",
    price: 11200,
    category: "Pratos Principais",
    image:
      "https://images.unsplash.com/photo-1599043513900-ed6fe01d3833?q=80&w=800&auto=format&fit=crop",
    isAvailable: true,
    portionInfo: "Prato individual",
    prepTimeMinutes: 25,
    ingredients: [
      { id: "ing-211", name: "Polvo", removable: false },
      { id: "ing-212", name: "Azeite Extra Virgem", removable: true },
    ],
  },
  {
    id: "menu-205",
    restaurantId: "rest-2",
    name: "Sopa de Marisco da Ilha",
    description:
      "Sopa cremosa de marisco variado, aromatizada com coentros frescos. Entrada perfeita antes do prato principal.",
    price: 4200,
    category: "Entradas",
    image:
      "https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=800&auto=format&fit=crop",
    isAvailable: true,
    portionInfo: "Tigela individual",
    prepTimeMinutes: 15,
    ingredients: [
      { id: "ing-213", name: "Marisco Variado", removable: false },
      { id: "ing-214", name: "Coentros Frescos", removable: true },
    ],
  },
  {
    id: "menu-206",
    restaurantId: "rest-2",
    name: "Ostras Frescas da Ilha (6 unidades)",
    description:
      "Ostras frescas servidas no gelo com limão e vinagrete. Direto da costa para a sua mesa.",
    price: 6500,
    category: "Entradas",
    image:
      "https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?q=80&w=800&auto=format&fit=crop",
    isAvailable: true,
    portionInfo: "6 unidades",
    prepTimeMinutes: 8,
    ingredients: [
      { id: "ing-215", name: "Ostras Frescas", removable: false },
      { id: "ing-216", name: "Vinagrete", removable: true },
      { id: "ing-217", name: "Limão", removable: true },
    ],
  },

  // ===== MAMMA MIA RISTORANTE (rest-3) =====
  // ===== MAMMA MIA RISTORANTE (rest-3) — Italiana =====
  {
    id: "menu-302",
    restaurantId: "rest-3",
    name: "Pizza Margherita no Forno a Lenha",
    description:
      "Massa fina fermentada 48h, molho de tomate San Marzano, mozzarella fior di latte e manjericão fresco.",
    price: 7800,
    category: "Pizza",
    image:
      "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?q=80&w=800&auto=format&fit=crop",
    isAvailable: true,
    portionInfo: "Pizza individual 30cm",
    prepTimeMinutes: 15,
    ingredients: [
      { id: "ing-305", name: "Mozzarella Fior di Latte", removable: false },
      { id: "ing-306", name: "Molho San Marzano", removable: false },
      { id: "ing-307", name: "Manjericão Fresco", removable: true },
    ],
  },
  {
    id: "menu-303",
    restaurantId: "rest-3",
    name: "Risotto ai Funghi Porcini",
    description:
      "Risotto cremoso com cogumelos porcini, vinho branco e parmesão envelhecido. Prato reconfortante e elegante.",
    price: 9200,
    category: "Massas",
    image:
      "https://images.unsplash.com/photo-1476124369491-e7addf5db371?q=80&w=800&auto=format&fit=crop",
    isAvailable: true,
    portionInfo: "Prato individual farto",
    prepTimeMinutes: 25,
    ingredients: [
      { id: "ing-308", name: "Arroz Arbóreo", removable: false },
      { id: "ing-309", name: "Cogumelos Porcini", removable: false },
      { id: "ing-310", name: "Parmesão", removable: true },
    ],
  },
  {
    id: "menu-304",
    restaurantId: "rest-3",
    name: "Lasanha Bolognese Tradicional",
    description:
      "Camadas de massa fresca, ragù bolonhesa e molho bechamel gratinadas no forno. Clássico que nunca falha.",
    price: 8900,
    category: "Massas",
    image:
      "https://images.unsplash.com/photo-1619895092538-128341789043?q=80&w=800&auto=format&fit=crop",
    isAvailable: true,
    portionInfo: "Porção individual",
    prepTimeMinutes: 30,
    ingredients: [
      { id: "ing-311", name: "Massa Fresca", removable: false },
      { id: "ing-312", name: "Molho Bechamel", removable: true },
    ],
  },
  {
    id: "menu-305",
    restaurantId: "rest-3",
    name: "Bruschette Tricolore",
    description:
      "Torradas de pão italiano com tomate fresco, mozzarella e pesto de manjericão. Entrada leve e colorida.",
    price: 3500,
    category: "Entradas",
    image:
      "https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?q=80&w=800&auto=format&fit=crop",
    isAvailable: true,
    portionInfo: "4 unidades",
    prepTimeMinutes: 10,
    ingredients: [
      { id: "ing-313", name: "Pão Italiano", removable: false },
      { id: "ing-314", name: "Tomate Fresco", removable: true },
      { id: "ing-315", name: "Pesto de Manjericão", removable: true },
    ],
  },
  {
    id: "menu-306",
    restaurantId: "rest-3",
    name: "Tiramisù della Casa",
    description:
      "Sobremesa clássica italiana com biscoitos champanhe embebidos em café, mascarpone e cacau em pó.",
    price: 3800,
    category: "Sobremesas",
    image:
      "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?q=80&w=800&auto=format&fit=crop",
    isAvailable: true,
    portionInfo: "Taça individual",
    prepTimeMinutes: 5,
    ingredients: [
      { id: "ing-316", name: "Mascarpone", removable: false },
      { id: "ing-317", name: "Café Espresso", removable: true },
      { id: "ing-318", name: "Cacau em Pó", removable: true },
    ],
  },

  // ===== TALATONA GRILL & CHURRASCARIA (rest-4) =====
  // ===== TALATONA GRILL & CHURRASCARIA (rest-4) — Grelhados =====
  {
    id: "menu-401",
    restaurantId: "rest-4",
    name: "Picanha na Brasa com Farofa",
    description:
      "Picanha grelhada no ponto certo, fatiada na hora, servida com farofa temperada e banana pão frita.",
    price: 9500,
    category: "Grelhados",
    image:
      "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=800&auto=format&fit=crop",
    isAvailable: true,
    portionInfo: "Corte de 350g",
    prepTimeMinutes: 25,
    isPromoted: true,
    promotionLabel: "Mais Pedido da Casa",
    orderCount: 150,
    ingredients: [
      { id: "ing-401", name: "Picanha", removable: false },
      { id: "ing-402", name: "Farofa Temperada", removable: true },
      { id: "ing-403", name: "Banana Pão Frita", removable: true },
      { id: "ing-404", name: "Molho Chimichurri", removable: true },
    ],
  },
  {
    id: "menu-402",
    restaurantId: "rest-4",
    name: "Costela Bovina 12 Horas na Brasa",
    description:
      "Costela cozida lentamente na brasa durante 12 horas até desmanchar, com molho barbecue caseiro.",
    price: 11000,
    category: "Grelhados",
    image:
      "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?q=80&w=800&auto=format&fit=crop",
    isAvailable: true,
    portionInfo: "Porção de 400g",
    prepTimeMinutes: 15,
    ingredients: [
      { id: "ing-405", name: "Costela Bovina", removable: false },
      { id: "ing-406", name: "Molho Barbecue", removable: true },
    ],
  },
  {
    id: "menu-403",
    restaurantId: "rest-4",
    name: "Espetada Mista de Rodízio",
    description:
      "Espetada com carne de vaca, frango e chouriço grelhados no espeto, servida diretamente na mesa.",
    price: 8200,
    category: "Grelhados",
    image:
      "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?q=80&w=800&auto=format&fit=crop",
    isAvailable: true,
    portionInfo: "Espeto grande",
    prepTimeMinutes: 20,
    ingredients: [
      { id: "ing-408", name: "Carne de Vaca", removable: false },
      { id: "ing-409", name: "Frango", removable: false },
      { id: "ing-410", name: "Chouriço", removable: true },
    ],
  },
  {
    id: "menu-404",
    restaurantId: "rest-4",
    name: "Entrecosto Grelhado com Batata Doce",
    description:
      "Entrecosto suculento marinado 24h, grelhado na brasa e acompanhado de batata doce assada.",
    price: 7800,
    category: "Grelhados",
    image:
      "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=800&auto=format&fit=crop",
    isAvailable: true,
    portionInfo: "Prato individual",
    prepTimeMinutes: 22,
    ingredients: [
      { id: "ing-411", name: "Entrecosto", removable: false },
      { id: "ing-412", name: "Batata Doce Assada", removable: true },
    ],
  },
  {
    id: "menu-405",
    restaurantId: "rest-4",
    name: "Farofa Temperada da Casa",
    description:
      "Farofa crocante com bacon, ovo e cebolinho — o acompanhamento clássico do rodízio.",
    price: 2200,
    category: "Acompanhamentos",
    image:
      "https://images.unsplash.com/photo-1625944230945-1b7dd3b949ab?q=80&w=800&auto=format&fit=crop",
    isAvailable: true,
    portionInfo: "Porção para partilhar",
    prepTimeMinutes: 10,
    ingredients: [
      { id: "ing-413", name: "Farinha de Mandioca", removable: false },
      { id: "ing-414", name: "Bacon", removable: true },
      { id: "ing-415", name: "Ovo", removable: true },
    ],
  },
  {
    id: "menu-406",
    restaurantId: "rest-4",
    name: "Banana Pão Frita com Canela",
    description:
      "Banana pão frita e polvilhada com açúcar e canela. Acompanhamento doce clássico do churrasco.",
    price: 1800,
    category: "Acompanhamentos",
    image:
      "https://images.unsplash.com/photo-1587132137056-08ab5d0b8b5a?q=80&w=800&auto=format&fit=crop",
    isAvailable: true,
    portionInfo: "Porção de 6 fatias",
    prepTimeMinutes: 8,
    ingredients: [
      { id: "ing-416", name: "Banana Pão", removable: false },
      { id: "ing-417", name: "Açúcar e Canela", removable: true },
    ],
  },

  // ===== SAKURA SUSHI LOUNGE (rest-5) — Japonês =====
  {
    id: "menu-501",
    restaurantId: "rest-5",
    name: "Combinado Sakura Premium (20 peças)",
    description:
      "Seleção de nigiri, sashimi e uramaki com salmão, atum e camarão fresco. O combinado mais pedido da casa.",
    price: 12500,
    category: "Combinados",
    image:
      "https://images.unsplash.com/photo-1553621042-f6e147245754?q=80&w=800&auto=format&fit=crop",
    isAvailable: true,
    portionInfo: "20 peças",
    prepTimeMinutes: 20,
    isPromoted: true,
    promotionLabel: "Mais Pedido da Casa",
    orderCount: 310,
    isTrending: true,
    ingredients: [
      { id: "ing-501", name: "Salmão Fresco", removable: false },
      { id: "ing-502", name: "Atum Fresco", removable: false },
      { id: "ing-503", name: "Camarão", removable: true },
      { id: "ing-504", name: "Gengibre e Wasabi", removable: true },
    ],
  },
  {
    id: "menu-502",
    restaurantId: "rest-5",
    name: "Temaki de Salmão com Cream Cheese",
    description: "Cone de alga nori recheado com arroz temperado, salmão fresco e cream cheese.",
    price: 4800,
    category: "Temakis",
    image:
      "https://images.unsplash.com/photo-1633478062482-790e3b5dd810?q=80&w=800&auto=format&fit=crop",
    isAvailable: true,
    portionInfo: "Unidade individual",
    prepTimeMinutes: 8,
    ingredients: [
      { id: "ing-505", name: "Salmão Fresco", removable: false },
      { id: "ing-506", name: "Cream Cheese", removable: true },
      { id: "ing-507", name: "Arroz Temperado", removable: false },
    ],
  },
  {
    id: "menu-503",
    restaurantId: "rest-5",
    name: "Uramaki Filadélfia (8 peças)",
    description:
      "Enrolado invertido com salmão grelhado, cream cheese e cebolinho, coberto com gergelim torrado.",
    price: 6500,
    category: "Uramaki",
    image:
      "https://images.unsplash.com/photo-1617196034183-421b4917c92d?q=80&w=800&auto=format&fit=crop",
    isAvailable: true,
    portionInfo: "8 peças",
    prepTimeMinutes: 15,
    ingredients: [
      { id: "ing-508", name: "Salmão Grelhado", removable: false },
      { id: "ing-509", name: "Cream Cheese", removable: true },
      { id: "ing-510", name: "Gergelim Torrado", removable: true },
    ],
  },
  {
    id: "menu-504",
    restaurantId: "rest-5",
    name: "Yakisoba de Frango e Legumes",
    description: "Noodles salteados no wok com frango, legumes crocantes e molho shoyu.",
    price: 5500,
    category: "Pratos Quentes",
    image:
      "https://images.unsplash.com/photo-1585032226651-759b368d7246?q=80&w=800&auto=format&fit=crop",
    isAvailable: true,
    portionInfo: "Prato individual",
    prepTimeMinutes: 15,
    ingredients: [
      { id: "ing-511", name: "Noodles", removable: false },
      { id: "ing-512", name: "Frango", removable: false },
      { id: "ing-513", name: "Legumes Salteados", removable: true },
    ],
  },
  {
    id: "menu-505",
    restaurantId: "rest-5",
    name: "Sopa Missoshiru",
    description: "Caldo tradicional japonês com pasta de missô, tofu, alga wakame e cebolinho.",
    price: 2500,
    category: "Entradas",
    image:
      "https://images.unsplash.com/photo-1607301405390-d831c242f59b?q=80&w=800&auto=format&fit=crop",
    isAvailable: true,
    portionInfo: "Tigela individual",
    prepTimeMinutes: 8,
    ingredients: [
      { id: "ing-514", name: "Pasta de Missô", removable: false },
      { id: "ing-515", name: "Tofu", removable: true },
      { id: "ing-516", name: "Alga Wakame", removable: true },
    ],
  },
  {
    id: "menu-506",
    restaurantId: "rest-5",
    name: "Harumaki de Legumes (5 unidades)",
    description:
      "Rolinhos primavera crocantes recheados com legumes salteados, servidos com molho agridoce.",
    price: 3800,
    category: "Entradas",
    image:
      "https://images.unsplash.com/photo-1548507200-64d8de8beefb?q=80&w=800&auto=format&fit=crop",
    isAvailable: true,
    portionInfo: "5 unidades",
    prepTimeMinutes: 10,
    ingredients: [
      { id: "ing-517", name: "Massa Crocante", removable: false },
      { id: "ing-518", name: "Legumes Salteados", removable: true },
    ],
  },
  // ===== TASCA DO ZÉ DA MUAMBA (rest-6) =====
  {
    id: "menu-601",
    restaurantId: "rest-6",
    name: "Moamba de Galinha Tradicional da Avó",
    description:
      "Galinha caipira cozinhada 2 horas em óleo de palma puro com quiabos tenros. Receita autêntica passada de geração em geração.",
    price: 8500,
    category: "Pratos Principais",
    image:
      "https://cookkudia.com/wp-content/uploads/2025/09/cookkudia_cozinha_angolana_moambagalinha.jpg",
    isAvailable: true,
    portionInfo: "Servido para 1 a 2 pessoas",
    prepTimeMinutes: 20,
    isPromoted: true,
    promotionLabel: "Mais Pedido da Casa",
    orderCount: 225,
    ingredients: [
      { id: "ing-601", name: "Galinha Caipira", removable: false },
      { id: "ing-602", name: "Óleo de Palma", removable: false },
      { id: "ing-603", name: "Quiabos Frescos", removable: true },
      { id: "ing-604", name: "Funge de Milho", removable: true },
    ],
  },
  {
    id: "menu-602",
    restaurantId: "rest-6",
    name: "Funge com Calulu de Peixe",
    description:
      "Funge de milho macio acompanhado com calulu de peixe fresco em caldo aromático de tomate e especiarias angolanas.",
    price: 7800,
    category: "Pratos Principais",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Calulu.jpg/250px-Calulu.jpg",
    isAvailable: true,
    portionInfo: "Para 2 pessoas",
    prepTimeMinutes: 25,
    ingredients: [
      { id: "ing-605", name: "Peixe Branco Fresco", removable: false },
      { id: "ing-606", name: "Tomate Natural", removable: true },
      { id: "ing-607", name: "Cebola", removable: true },
    ],
  },
  {
    id: "menu-603",
    restaurantId: "rest-6",
    name: "Fúnbua com Mombó e Carne",
    description:
      "Fúnbua cremosa de banana verde ralada com mombó fresco e carne moída ao tempero. Prato rústico e reconfortante.",
    price: 6500,
    category: "Pratos Principais",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQteyXRzxbrmOeJFa4FlQ-yX39jG4GUNr9uBOAtxuNkrsoUYPRMm-u-hBQ&s=10",
    isAvailable: true,
    portionInfo: "Prato individual farto",
    prepTimeMinutes: 20,
    ingredients: [
      { id: "ing-608", name: "Banana Verde", removable: false },
      { id: "ing-609", name: "Carne Moída", removable: false },
      { id: "ing-610", name: "Mombó Fresco", removable: true },
    ],
  },
  {
    id: "menu-604",
    restaurantId: "rest-6",
    name: "Feijão de Óleo de Palma",
    description:
      "Feijão preto cozido em óleo de palma puro com caldo de cebola e alho. Prato que alimenta a alma angolana.",
    price: 4500,
    category: "Pratos Principais",
    image:
      "https://cookkudia.com/wp-content/uploads/2025/09/cookkudia_cozinha_angolana_feijaodeoleodepalma.jpg",
    isAvailable: true,
    portionInfo: "Acompanhado com arroz ou funge",
    prepTimeMinutes: 15,
    ingredients: [
      { id: "ing-611", name: "Feijão Preto", removable: false },
      { id: "ing-612", name: "Óleo de Palma", removable: true },
    ],
  },
  {
    id: "menu-605",
    restaurantId: "rest-6",
    name: "Funge com Feijão e Calulu de Frango",
    description:
      "Funge de milho macio acompanhado com feijão cozido e calulu cremoso de frango. Prato tradicional e nutritivo.",
    price: 3500,
    category: "Pequeno-Almoço",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTdUmlMmh9ZMkFoP55LnzaEMCkMFQ1HMbi2NqNFVrymzRdkUfrO_1l0lGA&s=10",
    isAvailable: true,
    portionInfo: "Prato generoso",
    prepTimeMinutes: 10,
    ingredients: [
      { id: "ing-613", name: "Funge de Milho", removable: false },
      { id: "ing-614", name: "Frango Desfiado", removable: true },
      { id: "ing-615", name: "Feijão Cozido", removable: true },
    ],
  },
  {
    id: "menu-606",
    restaurantId: "rest-6",
    name: "Fúmbua Tradicional",
    description:
      "Milho moído em caldo cremoso com peixe seco ou carne. Prato tradicional angolano de confere conforto e sabor.",
    price: 3800,
    category: "Pequeno-Almoço",
    image: "https://cookkudia.com/wp-content/uploads/2025/09/cookkudia_cozinha_angolana_fumbua.jpg",
    isAvailable: true,
    portionInfo: "Tigela generosa",
    prepTimeMinutes: 15,
    ingredients: [
      { id: "ing-616", name: "Milho Moído", removable: false },
      { id: "ing-617", name: "Peixe Seco", removable: true },
      { id: "ing-618", name: "Caldo Aromático", removable: true },
    ],
  },

  // ===== RESTAURANTE TEMPERO ANGOLANO (rest-7) =====
  {
    id: "menu-701",
    restaurantId: "rest-7",
    name: "Peixe à Luanda Especial",
    description:
      "Peixe inteiro grelhado coberto com molho de tomate, pimentos e cebola caramelizada. Prato icónico de Luanda.",
    price: 12000,
    category: "Pratos Principais",
    image: "https://www.galloportugal.com/wp-content/uploads/2020/02/Mufete.jpg",
    isAvailable: true,
    portionInfo: "Peixe inteiro de 400-500g",
    prepTimeMinutes: 30,
    isPromoted: true,
    promotionLabel: "Especialidade da Casa",
    orderCount: 175,
    ingredients: [
      { id: "ing-701", name: "Peixe Inteiro Fresco", removable: false },
      { id: "ing-702", name: "Molho Tomate-Cebola", removable: true },
      { id: "ing-703", name: "Pimentos Grelhados", removable: true },
    ],
  },
  {
    id: "menu-702",
    restaurantId: "rest-7",
    name: "Moamba com Arroz de Milho",
    description:
      "Carne de vaca macia em molho rico de óleo de palma com espinafre fresco. Servido com arroz de milho crocante.",
    price: 10500,
    category: "Pratos Principais",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS5j5QtM4RchAai2MqJfE4PYTyQGyhSrG30GqhbFHVkuyRGEKMMDtC80PU&s=10",
    isAvailable: true,
    portionInfo: "Prato abundante",
    prepTimeMinutes: 35,
    ingredients: [
      { id: "ing-704", name: "Carne de Vaca", removable: false },
      { id: "ing-705", name: "Óleo de Palma", removable: false },
      { id: "ing-706", name: "Espinafre Fresco", removable: true },
    ],
  },
  {
    id: "menu-703",
    restaurantId: "rest-7",
    name: "Kizaca da Casa com Frango Grelhado",
    description:
      "Salada verde com abacate, tomate, cebola e molho caseiro. Acompanhado com frango grelhado na brasa.",
    price: 8500,
    category: "Pratos Principais",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTfnXEbKiorEyyDdaTP7puTHbL9vCsuF3q3TKjQmy0rFg&s=10",
    isAvailable: true,
    portionInfo: "Refeição leve e completa",
    prepTimeMinutes: 18,
    ingredients: [
      { id: "ing-707", name: "Alface Fresca", removable: true },
      { id: "ing-708", name: "Abacate Maduro", removable: true },
      { id: "ing-709", name: "Frango Grelhado", removable: false },
    ],
  },
  {
    id: "menu-704",
    restaurantId: "rest-7",
    name: "Pão de Milho Caseiro",
    description:
      "Pão feito com farinha de milho, macio por dentro e crocante por fora. Tradição que não morre.",
    price: 2500,
    category: "Acompanhamentos",
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=800&auto=format&fit=crop",
    isAvailable: true,
    portionInfo: "Unidade individual",
    prepTimeMinutes: 5,
    ingredients: [
      { id: "ing-710", name: "Farinha de Milho", removable: false },
      { id: "ing-711", name: "Fermento Natural", removable: false },
    ],
  },

  // ===== PEIXARIA & GRELHADOS BENILSON (rest-8) =====
  {
    id: "menu-801",
    restaurantId: "rest-8",
    name: "Barracuda Grelhada Inteira",
    description:
      "Barracuda fresca grelhada na brasa, limpa e temperada com limão, sal e piri-piri. Simples e delicioso.",
    price: 11000,
    category: "Pratos Principais",
    image: "https://media-cdn.tripadvisor.com/media/photo-s/0a/e7/f4/cf/barracuda-grelhada-com.jpg",
    isAvailable: true,
    portionInfo: "Peixe inteiro de 600g",
    prepTimeMinutes: 20,
    isPromoted: true,
    promotionLabel: "Peixe do Dia",
    orderCount: 410,
    isTrending: true,
    ingredients: [
      { id: "ing-801", name: "Barracuda Fresca", removable: false },
      { id: "ing-802", name: "Limão Fresco", removable: true },
      { id: "ing-803", name: "Piri-Piri Caseiro", removable: true },
    ],
  },
  {
    id: "menu-802",
    restaurantId: "rest-8",
    name: "Carapau Frito Inteiro",
    description:
      "Carapau pequeno passado na farinha e frito até ficar dourado e crocante. Acompanha arroz branco.",
    price: 7500,
    category: "Pratos Principais",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT1jDyf91UdaVe86BsoexwdLWkGfBuombhJm-2o5I8bA5hb7JEQEu7rgkU&s=10",
    isAvailable: true,
    portionInfo: "3 unidades de 150g cada",
    prepTimeMinutes: 12,
    ingredients: [
      { id: "ing-804", name: "Carapau Fresco", removable: false },
      { id: "ing-805", name: "Óleo de Palma", removable: false },
      { id: "ing-806", name: "Arroz Branco", removable: true },
    ],
  },
  {
    id: "menu-803",
    restaurantId: "rest-8",
    name: "Peixe-Espada Grelhado com Banana Frita",
    description: "Peixe-espada delicado grelhado ao lume e servido com banana pão frita dourada.",
    price: 9800,
    category: "Pratos Principais",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQSLcOEhNQtWtMpWFzHdXs3c83Qt8R1Z_dKaG9k_OYebeFSkh-J2T6mvtME&s=10",
    isAvailable: true,
    portionInfo: "Peixe inteiro 300g",
    prepTimeMinutes: 18,
    ingredients: [
      { id: "ing-807", name: "Peixe-Espada", removable: false },
      { id: "ing-808", name: "Banana Pão", removable: true },
      { id: "ing-809", name: "Molho de Piri", removable: true },
    ],
  },
  {
    id: "menu-804",
    restaurantId: "rest-8",
    name: "Peixe Bagre com Muteta",
    description:
      "Bife de bagre fresco grelhado na brasa com muteta (folhas verdes tradicionais). Prato autentico e saboroso.",
    price: 13500,
    category: "Pratos Principais",
    image:
      "https://cookkudia.com/wp-content/uploads/2025/09/cookkudia_cozinha_angolana_bagrecommuteta.jpg",
    isAvailable: true,
    portionInfo: "Bife de 400g",
    prepTimeMinutes: 22,
    ingredients: [
      { id: "ing-810", name: "Peixe Bagre", removable: false },
      { id: "ing-811", name: "Muteta", removable: true },
      { id: "ing-812", name: "Limão Taiti", removable: true },
    ],
  },
  {
    id: "menu-805",
    restaurantId: "rest-8",
    name: "Cabidela de Frango",
    description:
      "Frango em molho escuro feito com sangue de frango, vinho e especiarias. Prato tradicional angolano de sabor intenso.",
    price: 9200,
    category: "Pratos Principais",
    image:
      "https://cookkudia.com/wp-content/uploads/2025/09/cookkudia_cozinha_angolana_cabidela.jpg",
    isAvailable: true,
    portionInfo: "Prato individual",
    prepTimeMinutes: 35,
    ingredients: [
      { id: "ing-813", name: "Frango Fresco", removable: false },
      { id: "ing-814", name: "Sangue de Frango", removable: false },
      { id: "ing-815", name: "Vinho Tinto", removable: true },
    ],
  },

  // ===== CASA DA CACHUPA PREMIUM (rest-9) =====
  {
    id: "menu-901",
    restaurantId: "rest-9",
    name: "Cachupa Miúda Premium com Ovo e Queijo",
    description:
      "Cachupa cremosa, receita da avó Florinda. Milho moído em caldo de marisco com ovo frito e queijo meia cura ralado.",
    price: 5500,
    category: "Pequeno-Almoço",
    image:
      "https://i0.wp.com/criolacozinha.wordpress.com/wp-content/uploads/2016/05/cachupa-receita-tradicional-de-cabo-verde-vc3addeo-por-criola-cozinha-joana-lopes-receita-original-54.jpg?fit=1200%2C800&ssl=1",
    isAvailable: true,
    portionInfo: "Tigela generosa",
    prepTimeMinutes: 18,
    isPromoted: true,
    promotionLabel: "Receita da Avó",
    orderCount: 340,
    isTrending: true,
    ingredients: [
      { id: "ing-901", name: "Milho Moído Fino", removable: false },
      { id: "ing-902", name: "Ovo Caipira", removable: true },
      { id: "ing-903", name: "Queijo Meia Cura", removable: true },
    ],
  },
  {
    id: "menu-902",
    restaurantId: "rest-9",
    name: "Cachupa Grossa com Peixe Seco",
    description:
      "Milho em grãos cozido em caldo com peixe seco desfiado. Refeição substancial e tradicional.",
    price: 4800,
    category: "Pequeno-Almoço",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSE4J04HCpN6vG9h-YMsIqgTmm2EDNvI79z2PGP-xNcFHfGwpgbnmqHKB8&s=10",
    isAvailable: true,
    portionInfo: "Prato farto",
    prepTimeMinutes: 20,
    ingredients: [
      { id: "ing-904", name: "Milho em Grãos", removable: false },
      { id: "ing-905", name: "Peixe Seco", removable: true },
      { id: "ing-906", name: "Cebola", removable: true },
    ],
  },
  {
    id: "menu-903",
    restaurantId: "rest-9",
    name: "Cachupa com Caldo de Carne",
    description: "Cachupa servida com caldo quente de carne e ossos. Perfeito para os dias frios.",
    price: 6200,
    category: "Pratos Principais",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSE4J04HCpN6vG9h-YMsIqgTmm2EDNvI79z2PGP-xNcFHfGwpgbnmqHKB8&s=10",
    isAvailable: true,
    portionInfo: "Refeição completa",
    prepTimeMinutes: 25,
    ingredients: [
      { id: "ing-907", name: "Milho Moído", removable: false },
      { id: "ing-908", name: "Caldo de Carne", removable: true },
      { id: "ing-909", name: "Ossos de Vaca", removable: true },
    ],
  },
  {
    id: "menu-904",
    restaurantId: "rest-9",
    name: "Bebida Açucarada de Milho",
    description:
      "Bebida tradicional feita de milho moído, leite e açúcar. Refrescante e nutritiva.",
    price: 2200,
    category: "Bebidas",
    image:
      "https://images.unsplash.com/photo-1621263764928-df1444c5e859?q=80&w=800&auto=format&fit=crop",
    isAvailable: true,
    portionInfo: "Copo 400ml",
    prepTimeMinutes: 5,
    ingredients: [
      { id: "ing-910", name: "Milho em Grãos", removable: false },
      { id: "ing-911", name: "Leite Natural", removable: true },
      { id: "ing-912", name: "Açúcar de Cana", removable: true },
    ],
  },

  // ===== NOVOS PRATOS TRADICIONAIS (rest-9 & rest-6) =====
  {
    id: "menu-905",
    restaurantId: "rest-6",
    name: "Katato - Vegetais à Angolana",
    description:
      "Mistura de vegetais frescos refogados em óleo de palma com especiarias. Acompanha peixe ou carne grelhada.",
    price: 4200,
    category: "Acompanhamentos",
    image: "https://cookkudia.com/wp-content/uploads/2025/09/cookkudia_cozinha_angolana_katatu.jpg",
    isAvailable: true,
    portionInfo: "Prato individual",
    prepTimeMinutes: 12,
    ingredients: [
      { id: "ing-920", name: "Vegetais Frescos", removable: false },
      { id: "ing-921", name: "Óleo de Palma", removable: true },
      { id: "ing-922", name: "Alho e Cebola", removable: true },
    ],
  },
  {
    id: "menu-906",
    restaurantId: "rest-6",
    name: "Kikuanga - Purê de Abóbora",
    description:
      "Purê cremoso de abóbora fresca com temperos naturais. Acompanhamento perfeito para qualquer prato principal.",
    price: 3500,
    category: "Acompanhamentos",
    image:
      "https://cookkudia.com/wp-content/uploads/2025/09/cookkudia_cozinha_angolana_kikuanga.jpg",
    isAvailable: true,
    portionInfo: "Prato individual",
    prepTimeMinutes: 10,
    ingredients: [
      { id: "ing-923", name: "Abóbora Fresca", removable: false },
      { id: "ing-924", name: "Manteiga Natural", removable: true },
      { id: "ing-925", name: "Sal e Especiarias", removable: true },
    ],
  },
  {
    id: "menu-907",
    restaurantId: "rest-7",
    name: "Kizaca - Salada Tradicional Angolana",
    description:
      "Salada fresca com alface, tomate, cebola e molho caseiro de azeite. Refrescante e nutritiva.",
    price: 2800,
    category: "Acompanhamentos",
    image: "https://cookkudia.com/wp-content/uploads/2025/09/cookkudia_cozinha_angolana_kizaca.jpg",
    isAvailable: true,
    portionInfo: "Tigela generosa",
    prepTimeMinutes: 5,
    ingredients: [
      { id: "ing-926", name: "Alface Fresca", removable: true },
      { id: "ing-927", name: "Tomate", removable: true },
      { id: "ing-928", name: "Cebola", removable: true },
    ],
  },
  {
    id: "menu-908",
    restaurantId: "rest-7",
    name: "Macaiabo - Pasta de Abóbora Ralada",
    description:
      "Abóbora ralada fresca com temperos naturais. Acompanhamento típico angolano que acompanha peixes grelhados.",
    price: 3200,
    category: "Acompanhamentos",
    image:
      "https://cookkudia.com/wp-content/uploads/2025/09/cookkudia_cozinha_angolana_macaiabo.jpg",
    isAvailable: true,
    portionInfo: "Prato individual",
    prepTimeMinutes: 8,
    ingredients: [
      { id: "ing-929", name: "Abóbora Ralada", removable: false },
      { id: "ing-930", name: "Limão Fresco", removable: true },
      { id: "ing-931", name: "Temperos Naturais", removable: true },
    ],
  },
  {
    id: "menu-909",
    restaurantId: "rest-14",
    name: "Mufete - Peixe Grelhado na Brasa",
    description:
      "Peixe inteiro grelhado na brasa com molho de azeite e alho. Simples, fresco e absolutamente delicioso.",
    price: 11800,
    category: "Pratos Principais",
    image:
      "https://cookkudia.com/wp-content/uploads/2025/11/cookkudia_cozinha_angolana_mufete_.jpg",
    isAvailable: true,
    portionInfo: "Peixe inteiro 500g",
    prepTimeMinutes: 20,
    isPromoted: true,
    promotionLabel: "Clássico da Brasa",
    orderCount: 205,
    ingredients: [
      { id: "ing-932", name: "Peixe Inteiro Fresco", removable: false },
      { id: "ing-933", name: "Azeite de Alho", removable: true },
      { id: "ing-934", name: "Limão", removable: true },
    ],
  },

  // ===== FOGO & BRASA (rest-10) =====
  {
    id: "menu-1001",
    restaurantId: "rest-10",
    name: "Frango Assado Inteiro à Angolana",
    description:
      "Frango marinado 12h em piri-piri caseiro e alho, assado na brasa até ficar macio por dentro e crocante por fora.",
    price: 8800,
    category: "Pratos Principais",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQIZNflUVwKy6ZJRyqBOxepzjE7yY7esfdX6WAVI96w5Q&s",
    isAvailable: true,
    portionInfo: "Frango inteiro 1400g",
    prepTimeMinutes: 25,
    isPromoted: true,
    promotionLabel: "Especialidade",
    orderCount: 290,
    ingredients: [
      { id: "ing-1001", name: "Frango Caipira", removable: false },
      { id: "ing-1002", name: "Piri-Piri Caseiro", removable: true },
      { id: "ing-1003", name: "Alho Fresco", removable: true },
    ],
  },
  {
    id: "menu-1002",
    restaurantId: "rest-10",
    name: "Meia Franga Desfiada com Arroz",
    description:
      "Meia franga desmanchada com garfo, regada com molho piri-piri e servida com arroz de milho.",
    price: 6500,
    category: "Pratos Principais",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSgDsVhp0KDtig4XAGlritE5SszCXnFh4ZWAR4eAZi7cA&s=10",
    isAvailable: true,
    portionInfo: "Meia franga",
    prepTimeMinutes: 15,
    ingredients: [
      { id: "ing-1004", name: "Meia Franga", removable: false },
      { id: "ing-1005", name: "Molho Piri-Piri", removable: true },
      { id: "ing-1006", name: "Arroz de Milho", removable: true },
    ],
  },
  {
    id: "menu-1003",
    restaurantId: "rest-10",
    name: "Asa de Frango Temperada",
    description:
      "5 asas temperadas com piri-piri e alho, assadas na brasa. Comida de boteco perfeita.",
    price: 4500,
    category: "Pratos Principais",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTSlNEXTiEwkw1BJtsFbSnfLqWxTzM8UwoluG14pNWtuQ&s=10",
    isAvailable: true,
    portionInfo: "5 asas grandes",
    prepTimeMinutes: 12,
    ingredients: [
      { id: "ing-1007", name: "Asas de Frango", removable: false },
      { id: "ing-1008", name: "Tempero Piri-Piri", removable: true },
    ],
  },
  {
    id: "menu-1004",
    restaurantId: "rest-10",
    name: "Salada Fresca Mista",
    description: "Alface, tomate, abacate, cebola e molho caseiro refrescante.",
    price: 3200,
    category: "Acompanhamentos",
    image:
      "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=800&auto=format&fit=crop",
    isAvailable: true,
    portionInfo: "Tigela generosa",
    prepTimeMinutes: 5,
    ingredients: [
      { id: "ing-1009", name: "Alface Fresca", removable: true },
      { id: "ing-1010", name: "Tomate Vermelho", removable: true },
      { id: "ing-1011", name: "Abacate Maduro", removable: true },
    ],
  },

  // ===== RESTAURANTE RAÍZES DE ANGOLA (rest-11) =====
  {
    id: "menu-1101",
    restaurantId: "rest-11",
    name: "Moamba de Carne Vermelha Cremosa",
    description:
      "Carne vermelha macia em molho escuro de óleo de palma purificado com espinafre e quiabo.",
    price: 12500,
    category: "Pratos Principais",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT_MFH8gpI0_eVGpkpzwTOJDZNP9G4UAAVVy9UlYXNvZ_LvHXYS6G1bsk64&s=10",
    isAvailable: true,
    portionInfo: "Prato abundante",
    prepTimeMinutes: 35,
    isPromoted: true,
    promotionLabel: "Prato da Casa",
    orderCount: 160,
    ingredients: [
      { id: "ing-1101", name: "Carne Vermelha", removable: false },
      { id: "ing-1102", name: "Óleo de Palma", removable: false },
      { id: "ing-1103", name: "Espinafre", removable: true },
    ],
  },
  {
    id: "menu-1102",
    restaurantId: "rest-11",
    name: "Matamba de Banana Frita com Peixe",
    description: "Banana verde ralada cremosa com peixe desfiado e tempero natural.",
    price: 7800,
    category: "Pratos Principais",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ0i0WyW2Nv3fUSaRQha0MMHxApVqcFu6NZssCvP1Gg8A&s=10",
    isAvailable: true,
    portionInfo: "Prato confortante",
    prepTimeMinutes: 25,
    ingredients: [
      { id: "ing-1104", name: "Banana Verde", removable: false },
      { id: "ing-1105", name: "Peixe Branco", removable: false },
      { id: "ing-1106", name: "Azeite de Palma", removable: true },
    ],
  },
  {
    id: "menu-1103",
    restaurantId: "rest-11",
    name: "Caldeirada Genuína Angolana",
    description:
      "Postas de peixe, camarão e batata em caldeirão de barro. Receita centenária sem conservantes.",
    price: 11200,
    category: "Pratos Principais",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSu08Jl6kiGrpJzHGn5n1XUutDKIhmb3LuEksQl8vH5rg&s=10",
    isAvailable: true,
    portionInfo: "Para 2-3 pessoas",
    prepTimeMinutes: 40,
    ingredients: [
      { id: "ing-1107", name: "Peixe Fresco", removable: false },
      { id: "ing-1108", name: "Camarão", removable: true },
      { id: "ing-1109", name: "Batata Doce", removable: true },
    ],
  },
  {
    id: "menu-1104",
    restaurantId: "rest-11",
    name: "Arroz de Coelho Caçado",
    description:
      "Arroz cremoso com coelho caçado na semana e temperos naturais. Prato tradicional da região.",
    price: 13800,
    category: "Pratos Principais",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR95Ts5q_F0m8o6rqtqY7KC8QrX2B4pB9_k8Dul5l74T-7rOmjKmhKqmXHN&s=10",
    isAvailable: true,
    portionInfo: "Prato individual abundante",
    prepTimeMinutes: 40,
    ingredients: [
      { id: "ing-1110", name: "Coelho Caçado", removable: false },
      { id: "ing-1111", name: "Arroz Integral", removable: false },
      { id: "ing-1112", name: "Temperos Naturais", removable: true },
    ],
  },

  // ===== MERCADORIA PURA (rest-12) =====
  {
    id: "menu-1201",
    restaurantId: "rest-12",
    name: "Peixe à Luanda na Tradicional",
    description:
      "Peixe inteiro com molho tomate e cebola, método tradicional passado de geração em geração.",
    price: 9500,
    category: "Pratos Principais",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTe1CTRKJzaV2mm01tIeAeOyTixbclBUyyk0Y_LM9HZTxH53tkhquJIveo&s=10",
    isAvailable: true,
    portionInfo: "Peixe inteiro 450g",
    prepTimeMinutes: 28,
    isPromoted: true,
    promotionLabel: "Clássico do Boteco",
    orderCount: 235,
    ingredients: [
      { id: "ing-1201", name: "Peixe Inteiro", removable: false },
      { id: "ing-1202", name: "Molho de Tomate", removable: true },
      { id: "ing-1203", name: "Cebola Caramelizada", removable: true },
    ],
  },
  {
    id: "menu-1202",
    restaurantId: "rest-12",
    name: "Feijoada Angolana Autêntica",
    description:
      "Feijão preto cozido com carne vermelha e defumados angolanos. Servido com arroz branco e funge.",
    price: 8900,
    category: "Pratos Principais",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ_KUZ2kKRTrzjlBwKASMmlaE0qdoLjvb-kFsXzVstA29bg3BjHcWIr7s8g&s=10",
    isAvailable: true,
    portionInfo: "Prato robusto",
    prepTimeMinutes: 30,
    ingredients: [
      { id: "ing-1204", name: "Feijão Preto", removable: false },
      { id: "ing-1205", name: "Carne Vermelha", removable: false },
      { id: "ing-1206", name: "Defumados", removable: true },
    ],
  },
  {
    id: "menu-1203",
    restaurantId: "rest-12",
    name: "Kizaca com Peixe Grelhado",
    description:
      "Salada verde fresca com alface, tomate, abacate e cebola. Acompanhado com peixe grelhado.",
    price: 7200,
    category: "Pratos Principais",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSMh-5PEAqHONVAvrZPH7LYqqbnu0xGlX7ecPJOeLAMWdMiaxR6kWYKpDA&s=10",
    isAvailable: true,
    portionInfo: "Refeição leve",
    prepTimeMinutes: 15,
    ingredients: [
      { id: "ing-1207", name: "Alface Fresca", removable: true },
      { id: "ing-1208", name: "Abacate", removable: true },
      { id: "ing-1209", name: "Peixe Grelhado", removable: false },
    ],
  },

  // ===== MATAMBA & MOAMBA EXPRESS (rest-13) =====
  {
    id: "menu-1301",
    restaurantId: "rest-13",
    name: "Matamba de Banana Verde Especial",
    description:
      "Banana verde ralada com carne de vaca e azeite de palma. Servido quentinho, matamba do jeito que mãe faz.",
    price: 6800,
    category: "Pratos Principais",
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=800&auto=format&fit=crop",
    isAvailable: true,
    portionInfo: "Prato farto",
    prepTimeMinutes: 22,
    isPromoted: true,
    promotionLabel: "Do Jeito Tradicional",
    orderCount: 180,
    ingredients: [
      { id: "ing-1301", name: "Banana Verde", removable: false },
      { id: "ing-1302", name: "Carne Moída", removable: false },
      { id: "ing-1303", name: "Azeite de Palma", removable: false },
    ],
  },
  {
    id: "menu-1302",
    restaurantId: "rest-13",
    name: "Moamba Cremosa de Galinha e Peixe",
    description:
      "Combinação de galinha e peixe em molho escuro de óleo de palma com quiabos e espinafre.",
    price: 11500,
    category: "Pratos Principais",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS6mgHO5dx9xKTkG304cq8y7SRp7jF_6q9v_oBg9OJVYP8rqJjl-Detc4Y&s=10",
    isAvailable: true,
    portionInfo: "Para 2-3 pessoas",
    prepTimeMinutes: 35,
    ingredients: [
      { id: "ing-1304", name: "Galinha", removable: false },
      { id: "ing-1305", name: "Peixe Branco", removable: false },
      { id: "ing-1306", name: "Óleo de Palma", removable: false },
    ],
  },
  {
    id: "menu-1303",
    restaurantId: "rest-13",
    name: "Matamba com Peixe Seco",
    description: "Banana verde ralada com peixe seco desfiado. Refeição leve mas substancial.",
    price: 5900,
    category: "Pratos Principais",
    image:
      "https://i.ytimg.com/vi/DYgNzxBkEvw/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLBhIl7v2CLhflw2QWevYMJd4GCGgQ",
    isAvailable: true,
    portionInfo: "Prato generoso",
    prepTimeMinutes: 18,
    ingredients: [
      { id: "ing-1307", name: "Banana Verde", removable: false },
      { id: "ing-1308", name: "Peixe Seco", removable: false },
      { id: "ing-1309", name: "Azeite", removable: true },
    ],
  },

  // ===== ARROZ DE MARISCO DA COSTERA (rest-14) =====
  {
    id: "menu-1401",
    restaurantId: "rest-14",
    name: "Arroz de Marisco Premium Deluxe",
    description:
      "Arroz cremoso com camarão gigante, lula, amêijoa, peixe branco e temperos aromáticos. Caldo rico e saboroso.",
    price: 18500,
    category: "Pratos Principais",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ_yxLL_d3tC0Jc5cTG5dVtwhlDminbecxBGSg7KJ-I0bYbPA8uEVE7NeM&s=10",
    isAvailable: true,
    portionInfo: "Para 2-3 pessoas",
    prepTimeMinutes: 40,
    isPromoted: true,
    promotionLabel: "Especialidade da Costera",
    orderCount: 255,
    ingredients: [
      { id: "ing-1401", name: "Camarão Gigante", removable: false },
      { id: "ing-1402", name: "Lula Fresca", removable: false },
      { id: "ing-1403", name: "Amêijoa", removable: false },
      { id: "ing-1404", name: "Arroz Integral", removable: false },
      { id: "ing-1405", name: "Caldo Aromático", removable: true },
    ],
  },
  {
    id: "menu-1402",
    restaurantId: "rest-14",
    name: "Arroz de Camarão com Abóbora",
    description:
      "Arroz com camarão fresco e abóbora doce ralada. Sabor equilibrado e cores vibrantes.",
    price: 14800,
    category: "Pratos Principais",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQnv8wq1OLsWaal5FBolYvZGc4aQoV8nHtlGIkxc7Oh6g&s=10",
    isAvailable: true,
    portionInfo: "Para 2 pessoas",
    prepTimeMinutes: 35,
    ingredients: [
      { id: "ing-1406", name: "Camarão Fresco", removable: false },
      { id: "ing-1407", name: "Abóbora Doce", removable: true },
      { id: "ing-1408", name: "Arroz Branco", removable: false },
    ],
  },
  {
    id: "menu-1403",
    restaurantId: "rest-14",
    name: "Arroz de Peixe com Molho de Malagueta",
    description: "Arroz cremoso com peixe branco desfiado e molho de malagueta levemente picante.",
    price: 12500,
    category: "Pratos Principais",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS6l0qGSRA79lQEZWk4eDWoKl4y9tBvjUhKMqzflp65vw&s=10",
    isAvailable: true,
    portionInfo: "Prato abundante",
    prepTimeMinutes: 32,
    ingredients: [
      { id: "ing-1409", name: "Peixe Branco", removable: false },
      { id: "ing-1410", name: "Arroz Integral", removable: false },
      { id: "ing-1411", name: "Molho de Malagueta", removable: true },
    ],
  },
  {
    id: "menu-1404",
    restaurantId: "rest-14",
    name: "Gambas ao Alho na Brasa",
    description:
      "Gambas gigantes grelhadas na brasa com manteiga de alho e limão fresco. Simples, elegante, delicioso.",
    price: 16200,
    category: "Pratos Principais",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTzR3DoNpYIwqDmblCkMhvjDI9dj5q4J4MvcCpFyjZsXB9IwtQJXUXMqCk&s=10",
    isAvailable: true,
    portionInfo: "400g de gambas",
    prepTimeMinutes: 18,
    ingredients: [
      { id: "ing-1412", name: "Gambas Gigantes", removable: false },
      { id: "ing-1413", name: "Manteiga de Alho", removable: true },
      { id: "ing-1414", name: "Limão Fresco", removable: true },
    ],
  },

  // ===== PRATO RÁPIDO & SNACKS (rest-15) - FAST-FOOD =====
  {
    id: "menu-1501",
    restaurantId: "rest-15",
    name: "Fahita de Frango",
    description:
      "Frango desfiado em tortilha quente com pimentos, cebola caramelizada e molho de alho. Fast-food angolano na sua melhor forma.",
    price: 4500,
    category: "Fast-Food",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQwa-1d6JHY-V8fXC-2fvvVd-jnuZbY-rE1Xy_z_24MkDw6es9_dnH_kV5t&s=10",
    isAvailable: true,
    portionInfo: "Fahita individual",
    prepTimeMinutes: 8,
    isPromoted: true,
    promotionLabel: "Rápido & Saboroso",
    orderCount: 140,
    ingredients: [
      { id: "ing-1501", name: "Frango Desfiado", removable: false },
      { id: "ing-1502", name: "Tortilha Quente", removable: false },
      { id: "ing-1503", name: "Pimentos", removable: true },
      { id: "ing-1504", name: "Cebola", removable: true },
      { id: "ing-1501-addon-1", name: "Queijo Ralado Extra", removable: true, extraPrice: 300 },
      { id: "ing-1501-addon-2", name: "Molho Picante Extra", removable: true, extraPrice: 200 },
    ],
  },
  {
    id: "menu-1502",
    restaurantId: "rest-15",
    name: "Franguité - Pastel de Frango Frito",
    description:
      "Pastel crocante recheado com frango desfiado, catupiry e especiarias. Perfeito para comer na rua.",
    price: 3200,
    category: "Snacks",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTGqOO23C18pZKZbuRfVUu39NdKSJmPCqVtHWZON6KFFYTy2kdvMnVlr5U&s=10",
    isAvailable: true,
    portionInfo: "Pastel individual",
    prepTimeMinutes: 5,
    ingredients: [
      { id: "ing-1505", name: "Massa do Pastel", removable: false },
      { id: "ing-1506", name: "Frango Desfiado", removable: false },
      { id: "ing-1507", name: "Catupiry", removable: true },
    ],
  },
  {
    id: "menu-1503",
    restaurantId: "rest-15",
    name: "Cabrité - Pastel de Cabra Especiado",
    description:
      "Pastel crocante com carne de cabra bem temperada e molho piri-piri. Tradicional e delicioso.",
    price: 3500,
    category: "Snacks",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTdDo-xSN3bQRdUDu0wQMj3xevZtIBCkRi-SttcTOaAsapCjmf3oDonXL37&s=10",
    isAvailable: true,
    portionInfo: "Pastel individual",
    prepTimeMinutes: 6,
    ingredients: [
      { id: "ing-1508", name: "Massa Crocante", removable: false },
      { id: "ing-1509", name: "Carne de Cabra", removable: false },
      { id: "ing-1510", name: "Piri-Piri", removable: true },
    ],
  },
  {
    id: "menu-1504",
    restaurantId: "rest-15",
    name: "Pincho de Carne e Pimenta",
    description:
      "Espeto de carne grelhada na brasa com pimenta fresca. Comida de boteco angolano clássica.",
    price: 4800,
    category: "Grelhados",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRsB4wJ5UdDYSbexOBGPoKKAX3Nt_etHH0tfm-ZuWuZUtI4HfCiN9lxa5E&s=10",
    isAvailable: true,
    portionInfo: "3 espetos grandes",
    prepTimeMinutes: 10,
    ingredients: [
      { id: "ing-1511", name: "Carne Vermelha", removable: false },
      { id: "ing-1512", name: "Pimenta Fresca", removable: true },
      { id: "ing-1513", name: "Sal e Especiarias", removable: true },
    ],
  },
  {
    id: "menu-1505",
    restaurantId: "rest-15",
    name: "Hamburguer Angolano Duplo",
    description:
      "Dois bifes de carne com queijo derretido, alface, tomate, cebola e molho especial caseiro.",
    price: 5200,
    category: "Fast-Food",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQwa-1d6JHY-V8fXC-2fvvVd-jnuZbY-rE1Xy_z_24MkDw6es9_dnH_kV5t&s=10",
    isAvailable: true,
    portionInfo: "Hamburguer duplo",
    prepTimeMinutes: 8,
    ingredients: [
      { id: "ing-1514", name: "Carne Moída", removable: false },
      { id: "ing-1515", name: "Queijo", removable: true },
      { id: "ing-1516", name: "Alface e Tomate", removable: true },
      { id: "ing-1517", name: "Molho Caseiro", removable: true },
      { id: "ing-1514-addon-1", name: "Bacon Extra", removable: true, extraPrice: 500 },
      { id: "ing-1514-addon-2", name: "Queijo Extra", removable: true, extraPrice: 400 },
      { id: "ing-1514-addon-3", name: "Ovo Estrelado", removable: true, extraPrice: 350 },
    ],
  },
  {
    id: "menu-1506",
    restaurantId: "rest-15",
    name: "Churros Doces Crocantes",
    description:
      "Churros fritos no óleo quentinho, crocantes por fora e macios por dentro. Servidos com calda de chocolate ou canela com açúcar.",
    price: 2800,
    category: "Snacks",
    image:
      "https://images.unsplash.com/photo-1627521224765-63e9764a1570?q=80&w=800&auto=format&fit=crop",
    isAvailable: true,
    portionInfo: "Porção de 6 churros",
    prepTimeMinutes: 5,
    ingredients: [
      { id: "ing-1518", name: "Massa de Churro", removable: false },
      { id: "ing-1519", name: "Açúcar e Canela", removable: true },
      { id: "ing-1520", name: "Calda de Chocolate", removable: true },
    ],
  },
  {
    id: "menu-1507",
    restaurantId: "rest-15",
    name: "Coxinha Recheada de Frango",
    description:
      "Coxinha crocante com recheio cremoso de frango e catupiry. Clássico que nunca falha.",
    price: 2500,
    category: "Snacks",
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=800&auto=format&fit=crop",
    isAvailable: true,
    portionInfo: "Unidade individual",
    prepTimeMinutes: 4,
    ingredients: [
      { id: "ing-1521", name: "Massa de Coxinha", removable: false },
      { id: "ing-1522", name: "Frango Desfiado", removable: false },
      { id: "ing-1523", name: "Catupiry", removable: true },
    ],
  },

  // ===== ÁGUA MINERAL — item comum a vários restaurantes =====
  // (mesmo `name`/ingredientes em restaurantes diferentes, para exercitar
  // "restaurantes que também servem este prato" e "ingredientes comuns")
  {
    id: "menu-shared-agua-601",
    restaurantId: "rest-6",
    name: "Água Mineral 500ml",
    description: "Água mineral natural, bem gelada.",
    price: 500,
    category: "Bebidas",
    image:
      "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?q=80&w=800&auto=format&fit=crop",
    isAvailable: true,
    portionInfo: "Garrafa 500ml",
    prepTimeMinutes: 2,
    ingredients: [{ id: "ing-shared-agua-1", name: "Água Mineral", removable: false }],
  },
  {
    id: "menu-shared-agua-901",
    restaurantId: "rest-9",
    name: "Água Mineral 500ml",
    description: "Água mineral natural, bem gelada.",
    price: 500,
    category: "Bebidas",
    image:
      "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?q=80&w=800&auto=format&fit=crop",
    isAvailable: true,
    portionInfo: "Garrafa 500ml",
    prepTimeMinutes: 2,
    ingredients: [{ id: "ing-shared-agua-2", name: "Água Mineral", removable: false }],
  },
  {
    id: "menu-shared-agua-1001",
    restaurantId: "rest-10",
    name: "Água Mineral 500ml",
    description: "Água mineral natural, bem gelada.",
    price: 500,
    category: "Bebidas",
    image:
      "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?q=80&w=800&auto=format&fit=crop",
    isAvailable: true,
    portionInfo: "Garrafa 500ml",
    prepTimeMinutes: 2,
    ingredients: [{ id: "ing-shared-agua-3", name: "Água Mineral", removable: false }],
  },
  {
    id: "menu-shared-agua-1501",
    restaurantId: "rest-15",
    name: "Água Mineral 500ml",
    description: "Água mineral natural, bem gelada.",
    price: 500,
    category: "Bebidas",
    image:
      "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?q=80&w=800&auto=format&fit=crop",
    isAvailable: true,
    portionInfo: "Garrafa 500ml",
    prepTimeMinutes: 2,
    isPromoted: true,
    promotionLabel: "Sempre gelada",
    orderCount: 520,
    isTrending: true,
    ingredients: [{ id: "ing-shared-agua-4", name: "Água Mineral", removable: false }],
  },
];

export const INITIAL_RESERVATIONS: Reservation[] = [
  {
    id: "res-1001",
    restaurantId: "rest-1",
    restaurantName: "Bistrô Sabor & Arte",
    restaurantImage:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=800&auto=format&fit=crop",
    customerName: "Manuel Neto",
    customerPhone: "+244 923 111 222",
    customerEmail: "manuel.neto@gmail.com",
    date: "2026-08-12",
    time: "20:00",
    peopleCount: 4,
    cautionAmount: 2000,
    cautionStatus: "Paga (Garantia)",
    status: "Pendente",
    specialRequests: "Mesa perto da janela se possível. Celebração de aniversário.",
    createdAt: "2026-08-10 10:15",
  },
  {
    id: "res-1002",
    restaurantId: "rest-6",
    restaurantName: "Tasca do Zé da Muamba",
    restaurantImage:
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop",
    customerName: "Ana Paula Silva",
    customerPhone: "+244 912 888 999",
    customerEmail: "ana.silva@hotmail.com",
    date: "2026-08-11",
    time: "13:00",
    peopleCount: 2,
    cautionAmount: 1000,
    cautionStatus: "Paga (Garantia)",
    status: "Confirmada",
    specialRequests: "Almoço de negócios.",
    createdAt: "2026-08-09 16:40",
  },
];

export const INITIAL_ORDERS: DeliveryOrder[] = [
  {
    id: "ord-5001",
    restaurantId: "rest-6",
    restaurantName: "Tasca do Zé da Muamba",
    restaurantImage:
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop",
    customerName: "Eduardo Baptista",
    customerPhone: "+244 928 333 444",
    customerAddress: "Condomínio Atlântico, Bloco B, Ap. 402, Miramar",
    customerEmail: "eduardo@exemplo.ao",
    items: [
      {
        id: "cart-1",
        menuItem: {
          id: "menu-601",
          restaurantId: "rest-6",
          name: "Muamba de Galinha Tradicional da Avó",
          description:
            "Galinha caipira cozinhada 2 horas em óleo de palma puro com quiabos tenros.",
          price: 8500,
          category: "Pratos Principais",
          image:
            "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop",
          isAvailable: true,
          portionInfo: "Servido para 1 a 2 pessoas",
          prepTimeMinutes: 20,
          ingredients: [],
        },
        restaurantId: "rest-6",
        quantity: 1,
        selectedIngredients: [
          { id: "ing-601", name: "Galinha Caipira", included: true },
          { id: "ing-602", name: "Óleo de Palma", included: true },
          { id: "ing-603", name: "Quiabos Frescos", included: true },
        ],
        customQuestion: "Podem caprichar no jindungo à parte?",
        customQuestionAnswer:
          "Com certeza! Enviaremos uma dose extra de molho de jindungo caseiro.",
      },
    ],
    subtotal: 8500,
    deliveryFee: 800,
    total: 9300,
    paymentMethod: "Multicaixa Express",
    deliveryTimeOption: "ASAP",
    status: "A caminho",
    createdAt: "2026-08-10 12:30",
    estimatedTimeMinutes: 20,
  },
];

export const INITIAL_REVIEWS: Review[] = [
  {
    id: "rev-1",
    restaurantId: "rest-6",
    customerName: "Teresa Costa",
    rating: 5,
    date: "2026-08-05",
    comment:
      "A Muamba da Tasca do Zé é imbatível! A receita é autêntica, atendimento amigável e preço justo. Voltarei toda semana!",
    tags: ["Comida Autêntica", "Bom Atendimento", "Preço Justo"],
  },
  {
    id: "rev-2",
    restaurantId: "rest-9",
    customerName: "João da Silva",
    rating: 5,
    date: "2026-08-02",
    comment:
      "A Cachupa Miúda da Casa da Cachupa é a melhor que já comi. Receita da avó Florinda é de primeira qualidade!",
    tags: ["Cachupa Perfeita", "Receita Tradicional"],
  },
  {
    id: "rev-3",
    restaurantId: "rest-8",
    customerName: "Diogo Santos",
    rating: 5,
    date: "2026-07-28",
    comment:
      "Barracuda grelhada fresca e saborosa. O Benilson sabe escolher o peixe melhor da praia.",
    tags: ["Peixe Fresco", "Grelhado Perfeito"],
  },
];

export const INITIAL_CUSTOMERS: RegisteredCustomer[] = [
  {
    id: "cust-1",
    name: "Manuel Neto",
    phone: "+244 923 111 222",
    email: "manuel.neto@gmail.com",
    registeredDate: "2026-01-15",
    orderCount: 5,
    reservationCount: 3,
    notes: "Cliente VIP, prefere mesas externas.",
  },
  {
    id: "cust-2",
    name: "Ana Paula Silva",
    phone: "+244 912 888 999",
    email: "ana.silva@hotmail.com",
    registeredDate: "2026-03-20",
    orderCount: 8,
    reservationCount: 4,
    notes: "Frequenta mais as tascas tradicionais.",
  },
  {
    id: "cust-3",
    name: "Eduardo Baptista",
    phone: "+244 928 333 444",
    email: "eduardo@exemplo.ao",
    registeredDate: "2026-05-10",
    orderCount: 12,
    reservationCount: 6,
    notes: "Cliente frequente de delivery. Adora cachupa e marisco.",
  },
];

export const INITIAL_USER_PROFILE: UserProfile = {
  isLoggedIn: true,
  name: "Eduardo Baptista",
  email: "eduardombaptista2005@gmail.com",
  phone: "+244 928 333 444",
  avatar: perfilAvatar,
  defaultAddress: "Avenida 4 de Fevereiro, Edifício Marginal, 4º Andar, Luanda",
  locationPermissionGranted: true,
  userNeighborhood: "Miramar, Luanda",
  authMethod: "google",
};

export const INITIAL_OFFERS: Offer[] = [
  {
    id: "offer-1",
    type: "discount",
    title: "20% OFF no seu primeiro pedido",
    description: "Válido para novos clientes em qualquer restaurante parceiro.",
    code: "KINO20",
  },
  {
    id: "offer-2",
    type: "delivery",
    title: "Entrega Grátis",
    description: "Em pedidos acima de 15.000 Kz, em qualquer restaurante.",
  },
  {
    id: "offer-3",
    type: "happy-hour",
    title: "Happy Hour",
    description: "15% OFF em todas as bebidas, das 14h às 17h.",
  },
];

export const INITIAL_STORIES: RestaurantStory[] = [
  {
    id: "story-rest1-1",
    restaurantId: "rest-1",
    image:
      "https://cookkudia.com/wp-content/uploads/2025/09/cookkudia_cozinha_angolana_moambagalinha.jpg",
    createdAt: "2026-08-21T08:00:00.000Z",
  },
  {
    id: "story-rest1-2",
    restaurantId: "rest-1",
    image:
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop",
    createdAt: "2026-08-21T09:30:00.000Z",
  },
  {
    id: "story-rest4-1",
    restaurantId: "rest-4",
    image:
      "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=800&auto=format&fit=crop",
    createdAt: "2026-08-21T07:15:00.000Z",
  },
  {
    id: "story-rest4-2",
    restaurantId: "rest-4",
    image:
      "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?q=80&w=800&auto=format&fit=crop",
    createdAt: "2026-08-21T10:00:00.000Z",
  },
  {
    id: "story-rest4-3",
    restaurantId: "rest-4",
    image:
      "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?q=80&w=800&auto=format&fit=crop",
    createdAt: "2026-08-21T11:20:00.000Z",
  },
  {
    id: "story-rest5-1",
    restaurantId: "rest-5",
    image:
      "https://images.unsplash.com/photo-1553621042-f6e147245754?q=80&w=800&auto=format&fit=crop",
    createdAt: "2026-08-21T06:45:00.000Z",
  },
  {
    id: "story-rest9-1",
    restaurantId: "rest-9",
    image:
      "https://i0.wp.com/criolacozinha.wordpress.com/wp-content/uploads/2016/05/cachupa-receita-tradicional-de-cabo-verde-vc3addeo-por-criola-cozinha-joana-lopes-receita-original-54.jpg?fit=1200%2C800&ssl=1",
    createdAt: "2026-08-20T18:00:00.000Z",
  },
  {
    id: "story-rest9-2",
    restaurantId: "rest-9",
    image:
      "https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=800&auto=format&fit=crop",
    createdAt: "2026-08-20T19:30:00.000Z",
  },
  {
    id: "story-rest11-1",
    restaurantId: "rest-11",
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=800&auto=format&fit=crop",
    createdAt: "2026-08-21T12:10:00.000Z",
  },
];

export const INITIAL_SAVED_ADDRESSES: SavedAddress[] = [
  {
    id: "addr-1",
    label: "Casa",
    line1: "Avenida 4 de Fevereiro, Edifício Marginal, 4º Andar",
    line2: "Miramar, Luanda",
    isDefault: true,
  },
  {
    id: "addr-2",
    label: "Trabalho",
    line1: "Rua Rainha Ginga, Torre Kinaxixi, Piso 7",
    line2: "Maianga, Luanda",
  },
  {
    id: "addr-3",
    label: "Universidade",
    line1: "Universidade Agostinho Neto, Campus do Kilamba",
    line2: "Cacuaco, Luanda",
  },
];
