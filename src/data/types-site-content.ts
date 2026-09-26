/** Conteúdo institucional editável em /sistema/conteudo (ver plano —
 * contacto, "Sobre nós", equipa, testemunhos, FAQ). Espelha os Resources do
 * backend (backend/app/Http/Resources/Api/V1/Site*Resource.php). */

export type SiteSettings = {
  contactEmail: string | null;
  contactPhone: string | null;
  contactAddress: string | null;
  contactWhatsapp: string | null;
  aboutEyebrow: string | null;
  aboutTitle: string | null;
  aboutDescription: string | null;
  aboutHeroImageUrl: string | null;
  aboutHeroMediaType: "image" | "video";
  aboutHeroThumbnailUrl: string | null;
  processingStatus: string;
};

export type SiteTeamMember = {
  id: string;
  name: string;
  role: string;
  initials: string | null;
  photoUrl: string | null;
  position: number;
};

export type SiteTestimonial = {
  id: string;
  name: string;
  role: string;
  quote: string;
  initials: string | null;
  photoUrl: string | null;
  position: number;
};

export type SiteFaq = {
  id: string;
  question: string;
  answer: string;
  position: number;
};

export type SiteStats = {
  activeCustomers: number;
  partnerRestaurants: number;
  menuDishes: number;
  averageRating: number;
};

export type SiteContent = {
  settings: SiteSettings;
  team: SiteTeamMember[];
  testimonials: SiteTestimonial[];
  faqs: SiteFaq[];
};
