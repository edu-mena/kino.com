import { apiFetch } from "@/lib/api-client";

/** Formulário público de /contacto — backend/app/Http/Controllers/Api/V1/ContactMessageController.php.
 * Envia um email real para a equipa Luku (com Reply-To do remetente), em
 * vez do `mailto:` de antes (que dependia do visitante ter cliente de
 * email configurado no próprio dispositivo). */
export async function sendApiContactMessage(input: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<void> {
  await apiFetch("/contact-messages", { method: "POST", body: input });
}
