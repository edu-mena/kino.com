/**
 * Notas do restaurante sobre um cliente (`/admin/clientes`) — chave é o
 * email do cliente (a chave de agrupamento usada para montar a lista de
 * clientes a partir das reservas, ver `getRestaurantCustomers` em
 * `@/data/helpers`). Sem `typeof window` guard explícito em cada função
 * porque isto só é lido/escrito a partir de interação direta do usuário no
 * painel (nunca em `loader()`), mas mantém-se o try/catch pelo mesmo
 * motivo do resto da app: `localStorage` pode falhar (modo privado, quota).
 */

const NOTES_KEY = "kino_customer_notes";

function readNotes(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const stored = window.localStorage.getItem(NOTES_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

export function getCustomerNote(email: string): string {
  return readNotes()[email] ?? "";
}

export function setCustomerNote(email: string, text: string) {
  if (typeof window === "undefined") return;
  const notes = readNotes();
  if (text.trim()) {
    notes[email] = text;
  } else {
    delete notes[email];
  }
  window.localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}
