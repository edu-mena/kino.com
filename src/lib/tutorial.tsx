import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import { fetchApiPreferences, updateApiPreferences } from "@/data/api-preferences";
import { hasRealBackend } from "@/lib/api-client";
import { getAuthToken, useAuth } from "@/lib/auth";
import { usePreferences } from "@/lib/preferences";

const STORAGE_KEY = "luku_tutorial_status";
const DIETARY_ONBOARDING_KEY = "luku_dietary_onboarding_seen";

type TutorialValue = {
  /** Se o tour deve estar visível agora (controlado por quem o monta, ex: HomeLoggedIn). */
  isTourOpen: boolean;
  /** Balão animado "Estou aqui se precisar", mostrado depois de pular o tour. */
  showHint: boolean;
  startTour: () => void;
  completeTour: () => void;
  skipTour: () => void;
  dismissHint: () => void;
  /** Estado do painel mobile ("três pontos") — vive aqui (não local ao
   * SiteHeader) porque o tour precisa poder abri-lo sozinho para apontar
   * para funcionalidades que só existem lá dentro (idioma, preferências). */
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  /** Se o card de restrições alimentares (`DietaryOnboardingPopup`) deve
   * estar visível agora. É o `TutorialProvider` — não o próprio popup — quem
   * decide isto, para garantir por construção que ele e o tour nunca ficam
   * visíveis ao mesmo tempo: o card abre primeiro (assim que faz login) e o
   * tour só é autorizado a começar depois de o card ser fechado/respondido,
   * nunca antes nem ao mesmo tempo. */
  dietaryPopupOpen: boolean;
  /** Chamado pelo `DietaryOnboardingPopup` quando o card é respondido ou
   * dispensado. Fecha o card e marca-o como visto. */
  resolveDietaryOnboarding: () => void;
};

const TutorialContext = createContext<TutorialValue | null>(null);

export function TutorialProvider({ children }: { children: ReactNode }) {
  const { dietaryRestrictions } = usePreferences();
  const { isLoggedIn } = useAuth();
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dietaryPopupOpen, setDietaryPopupOpen] = useState(false);
  // Evita decidir duas vezes se `isLoggedIn` oscilar (ex: logout e login de
  // novo na mesma sessão) — a decisão de abrir tour/card é só uma por app.
  const decidedRef = useRef(false);
  // Com backend real, guarda o `tutorialSeen` já lido da API (ver efeito
  // abaixo) — para `resolveDietaryOnboarding` não ter de reler localStorage
  // (que deixou de ser a fonte de verdade nesse modo, sempre diria "não
  // visto" e reabriria o tour a cada vez que o card de restrições fosse
  // respondido).
  const apiTourSeenRef = useRef<boolean | undefined>(undefined);

  /** Com backend real, "visto" fica preso à CONTA (`user_preferences`), não
   * ao browser — localStorage sozinho fazia o tutorial/card reaparecerem
   * em qualquer dispositivo/browser novo, ou depois de limpar dados do
   * site, mesmo já respondidos antes (bug real, reportado). Sem backend
   * (demo), mantém-se o localStorage de sempre. Grava nos dois sítios
   * quando há backend — localStorage fica como cache otimista, não como
   * fonte de verdade. */
  const markDietaryDone = () => {
    try {
      localStorage.setItem(DIETARY_ONBOARDING_KEY, "done");
    } catch {
      // ignora — sem storage, a pergunta volta a aparecer na próxima visita.
    }
    if (!hasRealBackend) return;
    const token = getAuthToken();
    if (!token) return;
    void updateApiPreferences({ dietary_onboarding_seen: true }, token).catch(() => {
      // best-effort — pior caso, volta a perguntar na próxima sessão
    });
  };

  const markTourSeenPersisted = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "done");
    } catch {
      // ignora — sem storage, o tour volta a aparecer na próxima visita.
    }
    if (!hasRealBackend) return;
    const token = getAuthToken();
    if (!token) return;
    void updateApiPreferences({ tutorial_seen: true }, token).catch(() => {
      // best-effort — pior caso, volta a aparecer na próxima sessão
    });
  };

  /** Decide se o tour deve começar agora — chamado só depois de o card de
   * restrições ser fechado/respondido (ou de imediato, se o card já tinha
   * sido resolvido antes). `tourSeen` já vem decidido de quem chama (ver
   * useEffect abaixo) — sem backend real lê-se aqui mesmo, com backend real
   * já veio do fetch inicial (não dá para reler login síncrono ali). */
  const startTourIfDue = (tourSeenOverride?: boolean) => {
    let tourSeen = tourSeenOverride ?? true;
    if (tourSeenOverride === undefined) {
      try {
        tourSeen = localStorage.getItem(STORAGE_KEY) === "done";
      } catch {
        // localStorage indisponível — trata como já visto, não insiste.
      }
    }
    if (tourSeen) return;
    setIsTourOpen(true);
  };

  useEffect(() => {
    if (!isLoggedIn || decidedRef.current) return;
    decidedRef.current = true;

    if (hasRealBackend) {
      const token = getAuthToken();
      if (!token) return;
      fetchApiPreferences(token)
        .then(({ tutorialSeen, dietaryOnboardingSeen, dietaryRestrictions: apiDietary }) => {
          apiTourSeenRef.current = tutorialSeen;
          let dietarySeen = dietaryOnboardingSeen;
          if (!dietarySeen && apiDietary.length > 0) {
            // Já tem restrições guardadas (definidas antes desta pergunta
            // existir) — não mostra o card, mas conta como resolvido.
            markDietaryDone();
            dietarySeen = true;
          }
          if (!dietarySeen) {
            // Mesma razão do comentário abaixo (rede de segurança) — a
            // contagem só começa quando o card fica mesmo visível.
            setTimeout(() => setDietaryPopupOpen(true), 600);
            return;
          }
          setTimeout(() => startTourIfDue(tutorialSeen), 600);
        })
        .catch(() => {
          // Falha de rede a ler preferências — não insiste (evita mostrar
          // o onboarding a cada falha temporária da API).
        });
      return;
    }

    let dietarySeen = true;
    try {
      dietarySeen = localStorage.getItem(DIETARY_ONBOARDING_KEY) === "done";
    } catch {
      // localStorage indisponível — trata como já visto, não insiste.
    }

    if (!dietarySeen && dietaryRestrictions.length > 0) {
      // Já tem restrições guardadas (definidas antes desta pergunta
      // existir) — não mostra o card, mas conta como resolvido.
      markDietaryDone();
      dietarySeen = true;
    }

    if (!dietarySeen) {
      // O tempo de exibição conta a partir de agora, não do carregamento da
      // app — importante para quem demora a fazer login não "gastar" o card
      // sem nunca chegar a vê-lo (era esse o bug: a rede de segurança de 8s
      // estava ancorada ao boot da app, por isso muitas vezes o card já
      // estava a meio da contagem — ou mesmo prestes a fechar sozinho —
      // quando o utilizador finalmente chegava à home).
      const timer = setTimeout(() => setDietaryPopupOpen(true), 600);
      return () => clearTimeout(timer);
    }
    // Card já visto antes — não há por onde esperar, decide o tour já.
    const timer = setTimeout(() => startTourIfDue(), 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- decide isto uma única vez, quando o login resolve.
  }, [isLoggedIn]);

  // Rede de segurança do card de preferências: se ninguém interagir, fecha-se
  // sozinho — a contagem só começa quando o card fica mesmo visível (não no
  // boot da app), para nunca comer o tempo de exibição do utilizador.
  useEffect(() => {
    if (!dietaryPopupOpen) return;
    const timer = setTimeout(() => resolveDietaryOnboarding(), 8000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só depende de abrir/fechar.
  }, [dietaryPopupOpen]);

  const markTourDone = () => {
    markTourSeenPersisted();
    apiTourSeenRef.current = true;
    setIsTourOpen(false);
    // O tour pode ter aberto o painel mobile sozinho (passos de idioma/
    // preferências) — não deixa-lo aberto depois de terminar/pular.
    setMobileMenuOpen(false);
  };

  const resolveDietaryOnboarding = () => {
    markDietaryDone();
    setDietaryPopupOpen(false);
    // O tour só é mostrado depois do card de preferências (respondido ou
    // dispensado) — nunca antes, para não competir com ele pela atenção.
    // `apiTourSeenRef` (não localStorage) é a fonte de verdade com backend
    // real — já foi lido no efeito acima, antes do card sequer aparecer.
    setTimeout(() => startTourIfDue(apiTourSeenRef.current), 500);
  };

  const value: TutorialValue = {
    isTourOpen,
    showHint,
    startTour: () => setIsTourOpen(true),
    completeTour: () => markTourDone(),
    skipTour: () => {
      markTourDone();
      setShowHint(true);
    },
    dismissHint: () => setShowHint(false),
    mobileMenuOpen,
    setMobileMenuOpen,
    dietaryPopupOpen,
    resolveDietaryOnboarding,
  };

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
}

export function useTutorial() {
  const ctx = useContext(TutorialContext);
  if (!ctx) throw new Error("useTutorial must be used inside TutorialProvider");
  return ctx;
}
