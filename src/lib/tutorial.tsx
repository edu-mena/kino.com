import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "kino_tutorial_status";

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
};

const TutorialContext = createContext<TutorialValue | null>(null);

export function TutorialProvider({ children }: { children: ReactNode }) {
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Só decide se mostra o tour depois de ler o localStorage — evita um
  // flash do tour em quem já o viu antes (SSR/primeira pintura sem storage).
  useEffect(() => {
    let seen = true;
    try {
      seen = localStorage.getItem(STORAGE_KEY) === "done";
    } catch {
      // localStorage indisponível (privado/bloqueado) — trata como já visto,
      // não insiste em mostrar o tour a cada visita.
    }
    if (!seen) {
      const timer = setTimeout(() => setIsTourOpen(true), 600);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, []);

  const markDone = () => {
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
    completeTour: () => markDone(),
    skipTour: () => {
      markDone();
      setShowHint(true);
    },
    dismissHint: () => setShowHint(false),
    mobileMenuOpen,
    setMobileMenuOpen,
  };

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
}

export function useTutorial() {
  const ctx = useContext(TutorialContext);
  if (!ctx) throw new Error("useTutorial must be used inside TutorialProvider");
  return ctx;
}
