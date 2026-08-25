import { useEffect, useState } from "react";
import { useTranslation } from "@/i18n";
import { useAdminTutorial } from "@/lib/admin-tutorial";
import { cn } from "@/lib/utils";

type Step = {
  /** Corresponde a um `data-tour="admin-<target>"` em algum lugar do painel. */
  target: string;
  titleKey: string;
  descriptionKey: string;
};

const steps: Step[] = [
  {
    target: "orders",
    titleKey: "adminTutorial.step1Title",
    descriptionKey: "adminTutorial.step1Description",
  },
  {
    target: "menu",
    titleKey: "adminTutorial.step2Title",
    descriptionKey: "adminTutorial.step2Description",
  },
  {
    target: "reservations",
    titleKey: "adminTutorial.step3Title",
    descriptionKey: "adminTutorial.step3Description",
  },
  {
    target: "promotions",
    titleKey: "adminTutorial.step4Title",
    descriptionKey: "adminTutorial.step4Description",
  },
  {
    target: "restaurant",
    titleKey: "adminTutorial.step5Title",
    descriptionKey: "adminTutorial.step5Description",
  },
];

/** Alvos que só existem dentro do painel "mais opções" do topo mobile — o
 * tour precisa de o abrir sozinho antes de conseguir apontar para eles
 * (Promoções e Restaurante não cabem na barra inferior de 5 itens). */
const panelSteps = new Set(["promotions", "restaurant"]);

/** O mesmo `data-tour` pode existir em mais de um sítio (sidebar desktop +
 * painel mobile + barra inferior) — só uma versão fica visível de cada vez. */
function findVisibleTarget(id: string): HTMLElement | null {
  const els = document.querySelectorAll<HTMLElement>(`[data-tour="admin-${id}"]`);
  for (const el of els) {
    const rect = el.getBoundingClientRect();
    const onScreen = rect.left < window.innerWidth && rect.right > 0 && rect.bottom > 0;
    if (rect.width > 0 && rect.height > 0 && onScreen) return el;
  }
  return null;
}

/**
 * Tour guiado do painel do restaurante — equivalente ao `OnboardingTour` do
 * lado do cliente, mesmo mecanismo de spotlight, mas apontando para os itens
 * de navegação que cobrem o fluxo principal de quem gere um restaurante:
 * pedidos, cardápio, reservas, promoções e perfil.
 */
export function AdminOnboardingTour() {
  const { isTourOpen, completeTour, skipTour, mobileMenuOpen, setMobileMenuOpen } =
    useAdminTutorial();
  const { t } = useTranslation();
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (isTourOpen) setStepIndex(0);
  }, [isTourOpen]);

  const step = steps[stepIndex];

  useEffect(() => {
    if (!isTourOpen || !step) return;

    const needsPanel = panelSteps.has(step.target);
    setMobileMenuOpen(needsPanel);
    if (needsPanel && !mobileMenuOpen) return; // aguarda o painel abrir (re-render)

    const target = findVisibleTarget(step.target);
    if (!target) {
      if (stepIndex < steps.length - 1) setStepIndex((i) => i + 1);
      else completeTour();
      return;
    }

    setRect(null);
    target.scrollIntoView({ behavior: "smooth", block: "center" });

    let cancelled = false;
    const update = () => {
      if (!cancelled) setRect(target.getBoundingClientRect());
    };
    const timer = setTimeout(update, 320);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `step`/`completeTour`/`setMobileMenuOpen` recreated each render; only these should retrigger.
  }, [isTourOpen, stepIndex, mobileMenuOpen]);

  if (!isTourOpen || !step || !rect) return null;

  const isLast = stepIndex === steps.length - 1;
  const spacing = 10;
  const cardWidth = 320;
  const spaceBelow = window.innerHeight - rect.bottom;
  const placeAbove = spaceBelow < 220 && rect.top > 220;
  const left = Math.min(Math.max(rect.left, 16), Math.max(16, window.innerWidth - cardWidth - 16));

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal aria-label={t(step.titleKey)}>
      <div
        aria-hidden
        className="pointer-events-none fixed rounded-2xl transition-all duration-300 ease-out"
        style={{
          top: rect.top - spacing,
          left: rect.left - spacing,
          width: rect.width + spacing * 2,
          height: rect.height + spacing * 2,
          boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.6)",
        }}
      />

      <div
        className="fixed z-[61] w-[min(20rem,calc(100vw-2rem))] animate-in rounded-2xl border border-border bg-card p-5 shadow-2xl fade-in zoom-in-95"
        style={{
          top: placeAbove
            ? undefined
            : Math.min(rect.bottom + spacing + 8, window.innerHeight - 200),
          bottom: placeAbove ? window.innerHeight - rect.top + spacing + 8 : undefined,
          left,
        }}
      >
        <p className="text-xs font-bold uppercase tracking-wide text-brand">
          {t("tutorial.stepCounter", { current: stepIndex + 1, total: steps.length })}
        </p>
        <h3 className="mt-1 font-display text-lg font-bold text-primary">{t(step.titleKey)}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t(step.descriptionKey)}</p>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={skipTour}
            className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("tutorial.skip")}
          </button>
          <div className="flex items-center gap-1.5">
            {steps.map((s, i) => (
              <span
                key={s.target}
                className={cn(
                  "h-1.5 w-1.5 rounded-full transition-colors",
                  i === stepIndex ? "bg-brand" : "bg-border",
                )}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => (isLast ? completeTour() : setStepIndex((i) => i + 1))}
            className="shrink-0 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            {isLast ? t("tutorial.finish") : t("tutorial.next")}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Balão animado mostrado depois de pular o tour, apontando para o menu
 * "mais opções" do topo mobile (ou a sidebar no desktop) — some sozinho
 * passado um tempo, ou ao tocar. */
export function AdminTutorialHint() {
  const { showHint, dismissHint } = useAdminTutorial();
  const { t } = useTranslation();
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!showHint) return;
    const target = findVisibleTarget("nav-menu");
    if (!target) return;

    const update = () => setRect(target.getBoundingClientRect());
    update();
    window.addEventListener("resize", update);
    const autoHide = setTimeout(dismissHint, 6000);
    return () => {
      window.removeEventListener("resize", update);
      clearTimeout(autoHide);
    };
  }, [showHint, dismissHint]);

  if (!showHint || !rect) return null;

  const isSideways = rect.height > rect.width * 1.5;

  return (
    <div
      className="fixed z-[70] animate-in fade-in zoom-in-95"
      style={
        isSideways
          ? { top: rect.top + 16, left: rect.right + 14 }
          : { top: rect.bottom + 10, right: window.innerWidth - rect.right }
      }
    >
      <button
        type="button"
        onClick={dismissHint}
        aria-label={t("tutorial.hint")}
        className="relative flex animate-bounce items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-xl"
      >
        <span
          aria-hidden
          className={cn(
            "absolute h-2.5 w-2.5 rotate-45 bg-primary",
            isSideways ? "-left-1 top-1/2 -translate-y-1/2" : "-top-1 right-4",
          )}
        />
        {t("tutorial.hint")}
      </button>
    </div>
  );
}
