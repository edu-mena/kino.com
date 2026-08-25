import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "kino_admin_tutorial_status";

type AdminTutorialValue = {
  /** Se o tour deve estar visível agora. */
  isTourOpen: boolean;
  /** Balão animado "Estou aqui se precisar", mostrado depois de pular o tour. */
  showHint: boolean;
  startTour: () => void;
  completeTour: () => void;
  skipTour: () => void;
  dismissHint: () => void;
  /** Estado do painel "mais opções" do topo mobile — vive aqui (não local ao
   * AdminShell) porque o tour precisa poder abri-lo sozinho para apontar
   * para itens de nav que só existem lá dentro (Promoções, Restaurante). */
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
};

const AdminTutorialContext = createContext<AdminTutorialValue | null>(null);

/**
 * Equivalente ao `TutorialProvider` do lado do cliente, mas para o painel do
 * restaurante — sessão e storage próprios, nada partilhado com o tour do
 * cliente. Montado dentro de `AdminShell`, já depois da guarda de sessão, por
 * isso só entra em jogo quando há mesmo um restaurante autenticado.
 */
export function AdminTutorialProvider({ children }: { children: ReactNode }) {
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Só decide se mostra o tour depois de ler o localStorage — evita um
  // flash do tour em quem já o viu antes.
  useEffect(() => {
    let seen = true;
    try {
      seen = localStorage.getItem(STORAGE_KEY) === "done";
    } catch {
      // localStorage indisponível — trata como já visto, não insiste a cada visita.
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
    // O tour pode ter aberto o painel mobile sozinho (passos de Promoções/
    // Restaurante) — não deixa-lo aberto depois de terminar/pular.
    setMobileMenuOpen(false);
  };

  const value: AdminTutorialValue = {
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

  return <AdminTutorialContext.Provider value={value}>{children}</AdminTutorialContext.Provider>;
}

export function useAdminTutorial() {
  const ctx = useContext(AdminTutorialContext);
  if (!ctx) throw new Error("useAdminTutorial must be used inside AdminTutorialProvider");
  return ctx;
}
