import { apiFetch } from "@/lib/api-client";

/** Preferências reais (backend/app/Http/Controllers/Api/V1/UserPreferenceController.php)
 * — presas à CONTA, não ao browser (ver @/lib/tutorial e @/lib/preferences,
 * que antes só usavam localStorage: o tutorial/card de restrições
 * alimentares reaparecia em qualquer dispositivo/browser novo, ou depois
 * de limpar dados do site, mesmo já respondidos antes). Só os campos que a
 * API expõe (dietaryRestrictions/tutorialSeen/dietaryOnboardingSeen) — as
 * restantes preferências (favoritos, faixa de preço, etc.) continuam só em
 * localStorage, sem coluna própria no backend ainda. */
export type ApiPreferences = {
  dietaryRestrictions: string[];
  language: string;
  notificationsEnabled: boolean;
  tutorialSeen: boolean;
  dietaryOnboardingSeen: boolean;
  /** Restaurantes cujo perfil visita veem o seu nome (omissão: não). */
  shareNameOnProfileVisits: boolean;
};

export async function fetchApiPreferences(token: string): Promise<ApiPreferences> {
  const { data } = await apiFetch<{ data: ApiPreferences }>("/preferences", { token });
  return data;
}

export async function updateApiPreferences(
  patch: Partial<{
    dietary_restrictions: string[];
    tutorial_seen: boolean;
    dietary_onboarding_seen: boolean;
    share_name_on_profile_visits: boolean;
  }>,
  token: string,
): Promise<ApiPreferences> {
  const { data } = await apiFetch<{ data: ApiPreferences }>("/preferences", {
    method: "PUT",
    token,
    body: patch,
  });
  return data;
}
