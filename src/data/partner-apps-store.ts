import { safeLocalStorageSet } from "./safe-storage";

/**
 * Candidaturas de restaurantes a parceiro (formulário `/parceiros`, que hoje
 * só envia email). A área de sistema (`/sistema/parceiros`) mostra-as numa
 * fila com aprovar/recusar. Store pura e síncrona, segura em SSR.
 */
export type PartnerAppStatus = "pending" | "approved" | "rejected";

export type PartnerApplication = {
  id: string;
  restaurantName: string;
  ownerName: string;
  phone: string;
  email: string;
  province: string;
  message: string;
  createdAt: string; // ISO
  status: PartnerAppStatus;
};

const KEY = "kino_system_partner_apps_v1";
const CHANGE_EVENT = "kino:menu-changed";
const DAY = 86_400_000;

const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString();

export function seedPartnerApps(): PartnerApplication[] {
  return [
    {
      id: "papp-1",
      restaurantName: "Cantinho da Ilha",
      ownerName: "Aurélio Kiala",
      phone: "+244 923 771 004",
      email: "aurelio@cantinhodailha.ao",
      province: "Luanda",
      message: "Restaurante de peixe fresco na Ilha do Cabo, 40 lugares. Queremos entrega no Kino.",
      createdAt: daysAgo(1),
      status: "pending",
    },
    {
      id: "papp-2",
      restaurantName: "Grelha do Lubango",
      ownerName: "Teresa Nunda",
      phone: "+244 912 300 887",
      email: "geral@grelhalubango.ao",
      province: "Huíla",
      message: "Churrasqueira familiar, 6 anos de casa. Só levantamento no local, sem entrega.",
      createdAt: daysAgo(2),
      status: "pending",
    },
    {
      id: "papp-3",
      restaurantName: "Doce Benguela",
      ownerName: "Nelson Catata",
      phone: "+244 928 114 559",
      email: "nelson@docebenguela.ao",
      province: "Benguela",
      message: "Pastelaria e sobremesas. Interessados no plano Pro com QR nas mesas.",
      createdAt: daysAgo(4),
      status: "pending",
    },
    {
      id: "papp-4",
      restaurantName: "Muxima Food Truck",
      ownerName: "Igor Sebastião",
      phone: "+244 917 660 231",
      email: "muxima.truck@gmail.com",
      province: "Luanda",
      message: "Food truck itinerante em Talatona. Precisamos de morada variável — é possível?",
      createdAt: daysAgo(6),
      status: "pending",
    },
    {
      id: "papp-5",
      restaurantName: "Tacho de Cabinda",
      ownerName: "Márcia Fuca",
      phone: "+244 923 905 447",
      email: "tacho@cabinda.ao",
      province: "Cabinda",
      message: "Comida tradicional cabindesa. Queremos começar já no período gratuito.",
      createdAt: daysAgo(9),
      status: "pending",
    },
    {
      id: "papp-6",
      restaurantName: "Sushi Kalunga",
      ownerName: "Rui Panzo",
      phone: "+244 912 448 190",
      email: "contacto@sushikalunga.ao",
      province: "Luanda",
      message: "Sushi e poke bowls no Kilamba. Equipa de 12, entrega própria já montada.",
      createdAt: daysAgo(12),
      status: "pending",
    },
    {
      id: "papp-7",
      restaurantName: "Pizza da Marginal",
      ownerName: "Cláudia Mbala",
      phone: "+244 928 007 771",
      email: "geral@pizzamarginal.ao",
      province: "Luanda",
      message: "Pizzaria forno a lenha. Já operamos há 3 anos.",
      createdAt: daysAgo(20),
      status: "approved",
    },
    {
      id: "papp-8",
      restaurantName: "Quitandas Express",
      ownerName: "Bento Quibeto",
      phone: "+244 917 220 665",
      email: "bento@quitandas.ao",
      province: "Malanje",
      message: "Mercearia com refeições prontas. Sem cozinha própria.",
      createdAt: daysAgo(26),
      status: "rejected",
    },
  ];
}

function read(): PartnerApplication[] {
  if (typeof window === "undefined") return seedPartnerApps();
  try {
    const stored = window.localStorage.getItem(KEY);
    return stored ? (JSON.parse(stored) as PartnerApplication[]) : seedPartnerApps();
  } catch {
    return seedPartnerApps();
  }
}

function write(rows: PartnerApplication[]): boolean {
  if (typeof window === "undefined") return true;
  const ok = safeLocalStorageSet(KEY, JSON.stringify(rows));
  if (ok) window.dispatchEvent(new Event(CHANGE_EVENT));
  return ok;
}

export function getPartnerApps(): PartnerApplication[] {
  return read();
}

export function setPartnerAppStatus(id: string, status: PartnerAppStatus) {
  write(read().map((a) => (a.id === id ? { ...a, status } : a)));
}

export function removePartnerApp(id: string) {
  write(read().filter((a) => a.id !== id));
}
