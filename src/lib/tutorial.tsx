import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

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
   * visíveis ao mesmo tempo: o tour só é autorizado a abrir depois deste
   * card ser resolvido. */
  dietaryPopupOpen: boolean;
  /** Chamado pelo `DietaryOnboardingPopup` quando o card é respondido,
   * dispensado, ou decidido que não precisa de aparecer. Fecha o card e,
   * se ainda fizer sentido, agenda a abertura do tour. */
  resolveDietaryOnboarding: () => void;
};

const TutorialContext = createContext<TutorialValue | null>(null);

export function TutorialProvider({ children }: { children: ReactNode }) {
  const { dietaryRestrictions } = usePreferences();
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dietaryPopupOpen, setDietaryPopupOpen] = useState(false);
  const resolveDietaryRef = useRef<() => void>(() => {});

  // Decide tudo (se mostra o card de restrições, se mostra o tour, e em que
  // ordem) num único efeito — evita um flash de quem já viu tudo antes
  // (SSR/primeira pintura sem storage) e, mais importante, evita a
  // sobreposição dos dois: antes, cada um decidia sozinho e só se
  // coordenava por um evento de `window` + timers cruzados entre
  // componentes montados em pontos diferentes da árvore, o que deixava uma
  // janela de corrida (efeitos de filho correm antes dos do pai). Com o
  // estado dos dois a viver aqui, o tour só pode abrir depois deste efeito
  // marcar o card de restrições como resolvido — nunca em paralelo.
  useEffect(() => {
    let tourSeen = true;
    let dietarySeen = true;
    try {
      tourSeen = localStorage.getItem(STORAGE_KEY) === "done";
      dietarySeen = localStorage.getItem(DIETARY_ONBOARDING_KEY) === "done";
    } catch {
      // localStorage indisponível (privado/bloqueado) — trata ambos como já
      // vistos, não insiste em mostrar nada a cada visita.
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    let dietaryResolved = dietarySeen;

    const openTourIfDue = () => {
      if (tourSeen) return;
      timers.push(setTimeout(() => setIsTourOpen(true), 600));
    };

    const markDietaryDone = () => {
      if (dietaryResolved) return;
      dietaryResolved = true;
      try {
        localStorage.setItem(DIETARY_ONBOARDING_KEY, "done");
      } catch {
        // ignora — sem storage, a pergunta volta a aparecer na próxima visita.
      }
      setDietaryPopupOpen(false);
      openTourIfDue();
    };
    resolveDietaryRef.current = markDietaryDone;

    if (!dietarySeen) {
      if (dietaryRestrictions.length > 0) {
        // Já tem restrições guardadas (definidas antes desta pergunta
        // existir) — não mostra o card, mas conta como resolvido.
        markDietaryDone();
      } else {
        timers.push(setTimeout(() => setDietaryPopupOpen(true), 800));
        // Rede de segurança: se o card nunca se resolver (utilizador some
        // sem interagir), o tour arranca à mesma passado algum tempo.
        timers.push(setTimeout(markDietaryDone, 8000));
      }
    } else {
      openTourIfDue();
    }

    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- decide isto uma única vez, na primeira pintura.
  }, []);

  const markTourDone = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "done");
    } catch {
      // ignora — sem storage, o tour volta a aparecer na próxima visita.
    }
    setIsTourOpen(false);
    // O tour pode ter aberto o painel mobile sozinho (passos de idioma/
    // preferências) — não deixa-lo aberto depois de terminar/pular.
    setMobileMenuOpen(false);
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
    resolveDietaryOnboarding: () => resolveDietaryRef.current(),
  };

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
}

export function useTutorial() {
  const ctx = useContext(TutorialContext);
  if (!ctx) throw new Error("useTutorial must be used inside TutorialProvider");
  return ctx;
}
