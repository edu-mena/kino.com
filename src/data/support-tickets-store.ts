import { safeLocalStorageSet } from "./safe-storage";
import { CHANGE_EVENT, STORAGE_KEYS } from "./storage-keys";

/**
 * Tickets de suporte do painel do restaurante (`/admin/suporte`). Sem
 * backend: guardamos localmente e a área de sistema (`/sistema/suporte`)
 * lê a mesma lista. O `mailto` continua a ser disparado em paralelo.
 */
export type SupportTicket = {
  id: string;
  restaurantId: string;
  restaurantName: string;
  subject: string;
  message: string;
  createdAt: string;
  status: "open" | "resolved";
};

function read(): SupportTicket[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.supportTickets);
    return raw ? (JSON.parse(raw) as SupportTicket[]) : [];
  } catch {
    return [];
  }
}

function write(rows: SupportTicket[]) {
  if (typeof window === "undefined") return;
  if (safeLocalStorageSet(STORAGE_KEYS.supportTickets, JSON.stringify(rows))) {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

export function getTickets(): SupportTicket[] {
  return read().sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function createTicket(input: {
  restaurantId: string;
  restaurantName: string;
  subject: string;
  message: string;
}): SupportTicket {
  const ticket: SupportTicket = {
    id: `tkt-${Date.now()}`,
    ...input,
    createdAt: new Date().toISOString(),
    status: "open",
  };
  write([ticket, ...read()]);
  return ticket;
}

export function setTicketStatus(id: string, status: SupportTicket["status"]) {
  write(read().map((tkt) => (tkt.id === id ? { ...tkt, status } : tkt)));
}
