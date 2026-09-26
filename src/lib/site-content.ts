import { useEffect, useState } from "react";
import { fetchApiSiteContent, fetchApiSiteStats } from "@/data/api-site-content";
import type { SiteContent, SiteStats } from "@/data/types-site-content";
import { hasRealBackend } from "@/lib/api-client";

/** Sem backend real (demo em `*.vercel.app`) — mesmo texto que já estava
 * hardcoded em sobre.tsx/contacto.tsx antes deste conteúdo passar a ser
 * editável em /sistema/conteudo (ver LukuInstitutionalSeeder, a mesma cópia
 * do lado do backend). Nunca visto em produção real (aí `hasRealBackend` é
 * sempre `true`). */
const MOCK_CONTENT: SiteContent = {
  settings: {
    contactEmail: "ola@luku.ao",
    contactPhone: "+244 923 456 789",
    contactAddress: "Luanda, Angola",
    contactWhatsapp: "+244930814277",
    aboutEyebrow: "Sobre nós",
    aboutTitle: "O cardápio digital de Angola",
    aboutDescription:
      "A Luku nasceu em Luanda para ligar restaurantes e clientes num só lugar: pratos, preços, mesas e promoções, sempre à mão — sem ligações, sem cardápios de papel. Hoje a nossa ambição é maior: levar essa mesma experiência a restaurantes e clientes em todo o país.",
    aboutHeroImageUrl: null,
    aboutHeroMediaType: "image",
    aboutHeroThumbnailUrl: null,
    processingStatus: "ready",
  },
  team: [
    {
      id: "mock-team-1",
      name: "Christopher Rosinho",
      role: "CEO",
      initials: "CR",
      photoUrl: null,
      position: 1,
    },
    {
      id: "mock-team-2",
      name: "Eduardo Mena",
      role: "CTO",
      initials: "EM",
      photoUrl: null,
      position: 2,
    },
  ],
  testimonials: [
    {
      id: "mock-testimonial-1",
      name: "Carla Mendes",
      role: "Cliente",
      quote:
        "Nunca mais liguei para reservar mesa. Vejo o cardápio, os preços e agendo tudo pela Luku.",
      initials: "CM",
      photoUrl: null,
      position: 1,
    },
    {
      id: "mock-testimonial-2",
      name: "João Paulo",
      role: "Dono do Forno da Ilha",
      quote:
        "Trocámos os cardápios de papel por um QR Code. Os clientes adoraram e nós poupamos tempo todos os dias.",
      initials: "JP",
      photoUrl: null,
      position: 2,
    },
    {
      id: "mock-testimonial-3",
      name: "Inês Neto",
      role: "Cliente",
      quote: "Personalizo o pedido do jeito que quero, sem trocas de mensagem. É simples assim.",
      initials: "IN",
      photoUrl: null,
      position: 3,
    },
  ],
  faqs: [
    {
      id: "mock-faq-1",
      question: "A Luku faz entregas?",
      answer:
        "A Luku é, antes de tudo, o cardápio digital de um restaurante. A entrega é uma funcionalidade opcional que cada restaurante ativa se quiser oferecer — nem todos entregam.",
      position: 1,
    },
    {
      id: "mock-faq-2",
      question: "É grátis para usar como cliente?",
      answer:
        "Sim. Explorar cardápios, reservar mesas e fazer pedidos na Luku não tem qualquer custo para o cliente.",
      position: 2,
    },
    {
      id: "mock-faq-3",
      question: "Como coloco o meu restaurante na Luku?",
      answer:
        'Escolha "Sou restaurante / Parceria" no formulário abaixo ou visite a página de parceiros — a nossa equipa entra em contacto para configurar o seu cardápio digital.',
      position: 3,
    },
    {
      id: "mock-faq-4",
      question: "Posso personalizar os meus pedidos?",
      answer:
        "Sim, sempre que o restaurante disponibilizar essa opção você pode escolher os ingredientes do seu prato antes de finalizar o pedido.",
      position: 4,
    },
    {
      id: "mock-faq-5",
      question: "Quanto tempo demora o suporte a responder?",
      answer: "A nossa equipa costuma responder em até 24 horas úteis, por email ou telefone.",
      position: 5,
    },
  ],
};

const MOCK_STATS: SiteStats = {
  activeCustomers: 12000,
  partnerRestaurants: 350,
  menuDishes: 40000,
  averageRating: 4.8,
};

/** Conteúdo institucional público (contacto/"Sobre nós"/equipa/testemunhos/
 * FAQ) — consumido por /sobre e /contacto. Editado em /sistema/conteudo (ver
 * `useSiteContentAdmin`, montado só dentro de OperatorProviders); esta
 * leitura é pública e não precisa de nenhum contexto/token, por isso é só um
 * hook simples (mesmo padrão de `useDeliveryPolicy`), não um provider — os
 * dois únicos consumidores (`/sobre`, `/contacto`) não vivem debaixo de
 * nenhum provider comum que faça sentido partilhar. */
export function useSiteContentPublic(): { content: SiteContent | null; loading: boolean } {
  const [content, setContent] = useState<SiteContent | null>(hasRealBackend ? null : MOCK_CONTENT);
  const [loading, setLoading] = useState(hasRealBackend);

  useEffect(() => {
    if (!hasRealBackend) return;
    let cancelled = false;
    fetchApiSiteContent()
      .then((data) => {
        if (!cancelled) setContent(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { content, loading };
}

/** Números "automáticos" de /sobre — sempre calculados a partir dos dados
 * reais (ver SystemStatsController::siteStats), nunca escritos à mão. */
export function useSiteStats(): SiteStats | null {
  const [stats, setStats] = useState<SiteStats | null>(hasRealBackend ? null : MOCK_STATS);

  useEffect(() => {
    if (!hasRealBackend) return;
    let cancelled = false;
    fetchApiSiteStats()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return stats;
}
