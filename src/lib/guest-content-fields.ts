import heroBg from "@/assets/hero.webp";
import chiefIllustration from "@/assets/luku/chief.png";
import dateIllustration from "@/assets/luku/date.png";
import lukuHero from "@/assets/luku/hero.webp";
import menuIllustration from "@/assets/luku/menu.png";
import lukuVideo from "@/assets/luku/video.mp4";
import type { CropPresetName } from "@/lib/image-crop-presets";

/**
 * O que é editável nas páginas para visitantes (/sistema/conteudo →
 * "Páginas públicas"). Cada texto é a chave de tradução que a página já
 * usa — o texto editado substitui-a em todas as línguas (ver
 * `useGuestContent`); sem edição fica a tradução original. Acrescentar um
 * texto editável = acrescentar a chave aqui e usar `text(chave)` na página.
 */

/** Imagens originais, as que se veem sem edição. */
export const GUEST_MEDIA_DEFAULTS = {
  "homeGuest.heroImage": heroBg,
  "luku.heroImage": lukuHero,
  "luku.illustration1Image": dateIllustration,
  "luku.illustration2Image": menuIllustration,
  "luku.illustration3Image": chiefIllustration,
} as const;

export type GuestMediaKey = keyof typeof GUEST_MEDIA_DEFAULTS;

/** Vídeo original da página Luku (vem com o site). */
export const LUKU_VIDEO_DEFAULT: string = lukuVideo;

/** Papel do texto na página — dá a etiqueta do campo no admin. */
export type GuestTextRole = "title" | "text" | "button" | "item" | "alt";

export type GuestField =
  | { kind: "text"; key: string; role: GuestTextRole; multiline?: boolean }
  | { kind: "image"; key: GuestMediaKey; crop: CropPresetName }
  | { kind: "video" };

export type GuestSection = { titleKey: string; noteKey?: string; fields: GuestField[] };

export type GuestPageId = "home" | "luku" | "sobre" | "contacto";

export type GuestPage = { id: GuestPageId; labelKey: string; sections: GuestSection[] };

const title = (key: string): GuestField => ({ kind: "text", key, role: "title" });
const text = (key: string): GuestField => ({ kind: "text", key, role: "text", multiline: true });
const button = (key: string): GuestField => ({ kind: "text", key, role: "button" });
const item = (key: string): GuestField => ({ kind: "text", key, role: "item" });
const alt = (key: string): GuestField => ({ kind: "text", key, role: "alt" });
const image = (key: GuestMediaKey, crop: CropPresetName): GuestField => ({
  kind: "image",
  key,
  crop,
});

export const GUEST_PAGES: GuestPage[] = [
  {
    id: "home",
    labelKey: "sistema.conteudo.pageHome",
    sections: [
      {
        titleKey: "sistema.conteudo.secHomeHero",
        fields: [
          image("homeGuest.heroImage", "cover"),
          title("homeGuest.heroLine1"),
          title("homeGuest.heroLine2"),
          text("homeGuest.subtitle"),
          text("homeGuest.subtitleBrandPrefix"),
          button("homeGuest.login"),
          button("homeGuest.whatIsLuku"),
        ],
      },
      {
        titleKey: "sistema.conteudo.secHomeCards",
        fields: [
          title("homeGuest.reserveTitle"),
          text("homeGuest.reserveText"),
          title("homeGuest.offersTitle"),
          text("homeGuest.offersText"),
        ],
      },
    ],
  },
  {
    id: "luku",
    labelKey: "sistema.conteudo.pageLuku",
    sections: [
      {
        titleKey: "sistema.conteudo.secLukuHero",
        fields: [
          { kind: "video" },
          image("luku.heroImage", "cover"),
          title("luku.nearYouTitle"),
          text("luku.nearYouDescription"),
        ],
      },
      {
        titleKey: "sistema.conteudo.secLukuMenu",
        fields: [
          title("luku.bentoTitle"),
          text("luku.bentoDescription"),
          image("luku.illustration1Image", "illustration"),
          title("luku.illustration1Title"),
          text("luku.illustration1Description"),
          alt("luku.illustration1Alt"),
          image("luku.illustration2Image", "illustration"),
          title("luku.illustration2Title"),
          text("luku.illustration2Description"),
          alt("luku.illustration2Alt"),
          image("luku.illustration3Image", "illustration"),
          title("luku.illustration3Title"),
          text("luku.illustration3Description"),
          alt("luku.illustration3Alt"),
        ],
      },
      {
        titleKey: "sistema.conteudo.secLukuCta",
        // Os mesmos textos aparecem no fim da página Sobre.
        noteKey: "sistema.conteudo.secLukuCtaNote",
        fields: [
          title("luku.ctaRestaurantTitle"),
          text("luku.ctaRestaurantDescription"),
          button("luku.restaurantLogin"),
          title("luku.ctaCustomerTitle"),
          text("luku.ctaCustomerDescription"),
          button("luku.login"),
          button("luku.seeMenu"),
        ],
      },
      {
        titleKey: "sistema.conteudo.secLukuFeatures",
        fields: [
          title("luku.featuresTitle"),
          title("luku.forCustomersTitle"),
          item("luku.forCustomer1"),
          item("luku.forCustomer2"),
          item("luku.forCustomer3"),
          item("luku.forCustomer4"),
          item("luku.forCustomer5"),
          item("luku.forCustomer6"),
          title("luku.forRestaurantsTitle"),
          item("luku.forRestaurant1"),
          item("luku.forRestaurant2"),
          item("luku.forRestaurant3"),
          item("luku.forRestaurant4"),
          item("luku.forRestaurant5"),
        ],
      },
    ],
  },
  {
    id: "sobre",
    labelKey: "sistema.conteudo.pageSobre",
    sections: [
      {
        titleKey: "sistema.conteudo.secSobreHeadings",
        // O topo (título, descrição, imagem/vídeo) já está em "Geral".
        noteKey: "sistema.conteudo.secSobreNote",
        fields: [
          title("sobre.teamHeading"),
          title("sobre.partnersHeading"),
          button("sobre.becomePartner"),
          title("sobre.testimonialsHeading"),
        ],
      },
      {
        titleKey: "sistema.conteudo.secSobreStats",
        fields: [
          title("sobre.statActiveCustomers"),
          title("sobre.statPartnerRestaurants"),
          title("sobre.statMenuDishes"),
          title("sobre.statAverageRating"),
        ],
      },
    ],
  },
  {
    id: "contacto",
    labelKey: "sistema.conteudo.pageContacto",
    sections: [
      {
        titleKey: "sistema.conteudo.secContacto",
        fields: [
          title("contacto.eyebrow"),
          title("contacto.title"),
          text("contacto.description"),
          title("contacto.formTitle"),
          title("contacto.faqTitle"),
          button("contacto.whatsapp"),
          text("contacto.whatsappHint"),
        ],
      },
    ],
  },
];
