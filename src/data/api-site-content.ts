import { apiFetch } from "@/lib/api-client";
import type {
  SiteContent,
  SiteFaq,
  SiteStats,
  SiteTeamMember,
  SiteTestimonial,
} from "./types-site-content";

/** Leitura pública — consumida por /sobre e /contacto sem sessão nenhuma
 * (ver backend/app/Http/Controllers/Api/V1/SiteContentController::show). */
export async function fetchApiSiteContent(): Promise<SiteContent> {
  const { data } = await apiFetch<{ data: SiteContent }>("/site/content");
  return data;
}

/** Números "automáticos" da página /sobre — sempre calculados a partir dos
 * dados reais (SystemStatsController::siteStats), nunca escritos à mão. */
export async function fetchApiSiteStats(): Promise<SiteStats> {
  const { data } = await apiFetch<{ data: SiteStats }>("/system/site-stats");
  return data;
}

type SettingsInput = {
  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: string;
  contactWhatsapp?: string;
  aboutEyebrow?: string;
  aboutTitle?: string;
  aboutDescription?: string;
  /** Data URL (imagem ou vídeo) — só quando o hero muda (ver ImageUploadField
   * `accept="media"`); vídeo passa por transcodificação assíncrona no
   * backend, mesmo pipeline de Offer. */
  heroMedia?: { dataUrl: string; mediaType: "image" | "video" };
};

export async function updateApiSiteSettings(input: SettingsInput, token: string) {
  const body = new FormData();
  if (input.contactEmail !== undefined) body.append("contact_email", input.contactEmail);
  if (input.contactPhone !== undefined) body.append("contact_phone", input.contactPhone);
  if (input.contactAddress !== undefined) body.append("contact_address", input.contactAddress);
  if (input.contactWhatsapp !== undefined) body.append("contact_whatsapp", input.contactWhatsapp);
  if (input.aboutEyebrow !== undefined) body.append("about_eyebrow", input.aboutEyebrow);
  if (input.aboutTitle !== undefined) body.append("about_title", input.aboutTitle);
  if (input.aboutDescription !== undefined)
    body.append("about_description", input.aboutDescription);
  if (input.heroMedia) {
    const { dataUrlToFile } = await import("@/lib/api-upload");
    const ext = input.heroMedia.mediaType === "video" ? "mp4" : "jpg";
    body.append("hero_media", dataUrlToFile(input.heroMedia.dataUrl, `about-hero.${ext}`));
  }

  const { data } = await apiFetch<{ data: SiteContent["settings"] }>("/site/settings", {
    method: "POST",
    token,
    body,
  });
  return data;
}

type TeamMemberInput = {
  name: string;
  role: string;
  initials?: string;
  photoUrl?: string;
  position?: number;
};

export async function createApiSiteTeamMember(
  input: TeamMemberInput,
  token: string,
): Promise<SiteTeamMember> {
  const { data } = await apiFetch<{ data: SiteTeamMember }>("/site/team", {
    method: "POST",
    token,
    body: toSnakeCase(input),
  });
  return data;
}

export async function updateApiSiteTeamMember(
  id: string,
  input: Partial<TeamMemberInput>,
  token: string,
): Promise<SiteTeamMember> {
  const { data } = await apiFetch<{ data: SiteTeamMember }>(`/site/team/${id}`, {
    method: "POST",
    token,
    body: toSnakeCase(input),
  });
  return data;
}

export async function deleteApiSiteTeamMember(id: string, token: string): Promise<void> {
  await apiFetch(`/site/team/${id}`, { method: "DELETE", token });
}

type TestimonialInput = {
  name: string;
  role: string;
  quote: string;
  initials?: string;
  photoUrl?: string;
  position?: number;
};

export async function createApiSiteTestimonial(
  input: TestimonialInput,
  token: string,
): Promise<SiteTestimonial> {
  const { data } = await apiFetch<{ data: SiteTestimonial }>("/site/testimonials", {
    method: "POST",
    token,
    body: toSnakeCase(input),
  });
  return data;
}

export async function updateApiSiteTestimonial(
  id: string,
  input: Partial<TestimonialInput>,
  token: string,
): Promise<SiteTestimonial> {
  const { data } = await apiFetch<{ data: SiteTestimonial }>(`/site/testimonials/${id}`, {
    method: "POST",
    token,
    body: toSnakeCase(input),
  });
  return data;
}

export async function deleteApiSiteTestimonial(id: string, token: string): Promise<void> {
  await apiFetch(`/site/testimonials/${id}`, { method: "DELETE", token });
}

type FaqInput = { question: string; answer: string; position?: number };

export async function createApiSiteFaq(input: FaqInput, token: string): Promise<SiteFaq> {
  const { data } = await apiFetch<{ data: SiteFaq }>("/site/faqs", {
    method: "POST",
    token,
    body: toSnakeCase(input),
  });
  return data;
}

export async function updateApiSiteFaq(
  id: string,
  input: Partial<FaqInput>,
  token: string,
): Promise<SiteFaq> {
  const { data } = await apiFetch<{ data: SiteFaq }>(`/site/faqs/${id}`, {
    method: "PATCH",
    token,
    body: toSnakeCase(input),
  });
  return data;
}

export async function deleteApiSiteFaq(id: string, token: string): Promise<void> {
  await apiFetch(`/site/faqs/${id}`, { method: "DELETE", token });
}

/** `photoUrl`/`initials`/... (camelCase, mesmo idioma do resto do frontend)
 * -> `photo_url`/... (nomes que os FormRequests do backend esperam). Só as
 * chaves de 1º nível destes inputs precisam disto — nenhum tem objetos
 * aninhados. */
function toSnakeCase(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    out[key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`)] = value;
  }
  return out;
}
