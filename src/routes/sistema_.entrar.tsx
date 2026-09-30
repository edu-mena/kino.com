import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Copy, KeyRound, Lock, Mail, ShieldCheck } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import icon from "@/assets/icon.png";
import { ForgotPasswordDialog } from "@/components/forgot-password-dialog";
import { Logo } from "@/components/logo";
import { useTranslation } from "@/i18n";
import { apiFetch, ApiError, hasRealBackend } from "@/lib/api-client";
import { OperatorProviders } from "@/lib/operator-providers";
import { useSystemAdmin, type TwoFactorSetup } from "@/lib/system-admin";

export const Route = createFileRoute("/sistema_/entrar")({
  head: () => ({
    meta: [
      { title: "Administração de sistema — Luku.com" },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Administração de sistema — Luku.com" },
      { property: "og:image", content: icon },
    ],
  }),
  component: () => (
    <OperatorProviders>
      <SistemaEntrar />
    </OperatorProviders>
  ),
});

/** Passos do login de sistema — a senha certa só dá um `challenge`; o
 * token vem depois do 2FA (obrigatório, ver backend TwoFactorController). */
type Step =
  | { kind: "credentials" }
  | { kind: "verify"; challenge: string }
  | { kind: "setup"; challenge: string; setup: TwoFactorSetup | null }
  | { kind: "recovery"; codes: string[]; startSession: () => void };

function SistemaEntrar() {
  const { login, setupTwoFactor, confirmTwoFactor, verifyTwoFactor } = useSystemAdmin();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const [savedCodes, setSavedCodes] = useState(false);
  const [step, setStep] = useState<Step>({ kind: "credentials" });
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const { t } = useTranslation();

  // Avisa o backend (email de alerta + auditoria, ver
  // SystemAccessController::notify) sempre que esta página é aberta — pedido
  // explícito de segurança do utilizador. Fire-and-forget: nunca bloqueia a
  // página nem mostra erro ao visitante, e não corre de todo na demo sem
  // backend (VITE_API_BASE_URL vazia, ver hasRealBackend).
  useEffect(() => {
    if (!hasRealBackend) return;
    apiFetch("/system-access/notify", { method: "POST" }).catch(() => {
      // silencioso — ver comentário acima
    });
  }, []);

  /** 401 no 2FA = challenge expirado/esgotado — volta à senha. */
  const handleStepError = (error: unknown) => {
    if (error instanceof ApiError && error.status === 401) {
      setStep({ kind: "credentials" });
      setPassword("");
    }
    setCode("");
    toast.error(error instanceof ApiError ? error.message : t("sistema.entrar.errorToast"));
  };

  // Conta sem 2FA: pede o QR assim que entra no passo de ativação.
  const setupChallenge = step.kind === "setup" && !step.setup ? step.challenge : null;
  useEffect(() => {
    if (!setupChallenge) return;
    setupTwoFactor(setupChallenge)
      .then((setup) => setStep({ kind: "setup", challenge: setupChallenge, setup }))
      .catch(handleStepError);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só ao mudar de challenge
  }, [setupChallenge]);

  const finish = () => {
    toast.success(t("sistema.entrar.successToast"));
    navigate({ to: "/sistema" });
  };

  const run = async (action: () => Promise<void>) => {
    setLoading(true);
    try {
      await action();
    } catch (error) {
      handleStepError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const { twoFactor, challenge } = await login(email, password);
      setCode("");
      setStep(
        twoFactor === "required"
          ? { kind: "verify", challenge }
          : { kind: "setup", challenge, setup: null },
      );
    });
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (step.kind !== "verify") return;
    void run(async () => {
      const { recoveryCodesLeft } = await verifyTwoFactor(
        step.challenge,
        useRecovery ? { recoveryCode: code } : { code },
      );
      if (recoveryCodesLeft !== undefined) {
        toast.warning(
          t("sistema.entrar.twoFactor.recoveryLeft", { count: String(recoveryCodesLeft) }),
        );
      }
      finish();
    });
  };

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (step.kind !== "setup") return;
    void run(async () => {
      const { recoveryCodes, startSession } = await confirmTwoFactor(step.challenge, code);
      setStep({ kind: "recovery", codes: recoveryCodes, startSession });
    });
  };

  const copyCodes = (codes: string[]) => {
    navigator.clipboard?.writeText(codes.join("\n")).then(
      () => toast.success(t("sistema.entrar.twoFactor.copied")),
      () => undefined,
    );
  };

  const recoveryMode = useRecovery && step.kind === "verify";

  const codeInput = (
    <div className="relative">
      <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        required
        autoFocus
        autoComplete="one-time-code"
        inputMode={recoveryMode ? "text" : "numeric"}
        maxLength={recoveryMode ? 20 : 6}
        value={code}
        onChange={(e) => setCode(e.target.value.trim())}
        placeholder={
          recoveryMode
            ? t("sistema.entrar.twoFactor.recoveryPlaceholder")
            : t("sistema.entrar.twoFactor.codePlaceholder")
        }
        className="w-full rounded-xl border border-border bg-card py-3.5 pl-11 pr-4 text-sm tracking-widest text-foreground outline-none focus:border-primary"
      />
    </div>
  );

  const submitButton = (label: string) => (
    <button
      type="submit"
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {loading ? t("sistema.entrar.submitting") : label}
    </button>
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-5 py-12 sm:px-12">
      <div className="w-full max-w-sm">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> {t("sistema.entrar.backHome")}
        </Link>

        <div className="mt-6">
          <Logo />
        </div>

        <div className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-primary">
          <ShieldCheck className="h-3.5 w-3.5" />
          {t("sistema.shellBadge")}
        </div>
        <h1 className="mt-3 text-3xl font-extrabold text-primary">{t("sistema.entrar.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("sistema.entrar.description")}</p>

        {step.kind === "credentials" && (
          <>
            <form onSubmit={handleCredentials} className="mt-8 space-y-3">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("sistema.entrar.emailPlaceholder")}
                  className="w-full rounded-xl border border-border bg-card py-3.5 pl-11 pr-4 text-sm text-foreground outline-none focus:border-primary"
                />
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("sistema.entrar.passwordPlaceholder")}
                  className="w-full rounded-xl border border-border bg-card py-3.5 pl-11 pr-4 text-sm text-foreground outline-none focus:border-primary"
                />
              </div>

              {submitButton(t("sistema.entrar.submit"))}
            </form>

            <button
              type="button"
              onClick={() => setForgotOpen(true)}
              className="mt-4 block w-full text-center text-sm font-semibold text-primary hover:underline"
            >
              {t("adminEntrar.forgotPassword")}
            </button>
          </>
        )}

        {step.kind === "verify" && (
          <form onSubmit={handleVerify} className="mt-8 space-y-3">
            <p className="text-sm text-muted-foreground">
              {useRecovery
                ? t("sistema.entrar.twoFactor.recoveryDescription")
                : t("sistema.entrar.twoFactor.verifyDescription")}
            </p>
            {codeInput}
            {submitButton(t("sistema.entrar.twoFactor.verify"))}
            <button
              type="button"
              onClick={() => {
                setUseRecovery((v) => !v);
                setCode("");
              }}
              className="block w-full text-center text-sm font-semibold text-primary hover:underline"
            >
              {useRecovery
                ? t("sistema.entrar.twoFactor.useApp")
                : t("sistema.entrar.twoFactor.useRecovery")}
            </button>
          </form>
        )}

        {step.kind === "setup" && (
          <form onSubmit={handleConfirm} className="mt-8 space-y-4">
            <div>
              <h2 className="text-base font-bold text-foreground">
                {t("sistema.entrar.twoFactor.setupTitle")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("sistema.entrar.twoFactor.setupDescription")}
              </p>
            </div>
            {step.setup ? (
              <>
                <div className="flex justify-center rounded-xl border border-border bg-white p-4">
                  <QRCodeSVG value={step.setup.otpauthUrl} size={176} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("sistema.entrar.twoFactor.manualKey")}{" "}
                  <code className="break-all font-mono text-foreground">{step.setup.secret}</code>
                </p>
                {codeInput}
                {submitButton(t("sistema.entrar.twoFactor.activate"))}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t("sistema.entrar.submitting")}</p>
            )}
          </form>
        )}

        {step.kind === "recovery" && (
          <div className="mt-8 space-y-4">
            <div>
              <h2 className="text-base font-bold text-foreground">
                {t("sistema.entrar.twoFactor.recoveryTitle")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("sistema.entrar.twoFactor.recoveryCodesDescription")}
              </p>
            </div>
            <ul className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-card p-4 font-mono text-sm text-foreground">
              {step.codes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => copyCodes(step.codes)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            >
              <Copy className="h-4 w-4" /> {t("sistema.entrar.twoFactor.copy")}
            </button>
            <label className="flex items-start gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={savedCodes}
                onChange={(e) => setSavedCodes(e.target.checked)}
                className="mt-0.5"
              />
              {t("sistema.entrar.twoFactor.savedConfirm")}
            </label>
            <button
              type="button"
              disabled={!savedCodes}
              onClick={() => {
                step.startSession();
                finish();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {t("sistema.entrar.twoFactor.continue")}
            </button>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {t("sistema.entrar.notice")}
        </p>
      </div>
      <ForgotPasswordDialog open={forgotOpen} onOpenChange={setForgotOpen} />
    </div>
  );
}
