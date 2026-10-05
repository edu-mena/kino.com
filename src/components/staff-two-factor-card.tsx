import { Copy, ShieldCheck } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/i18n";
import { ApiError, apiFetch, hasRealBackend } from "@/lib/api-client";
import { getAdminToken, isOperatorAdminSession } from "@/lib/restaurant-admin";

type Setup = { secret: string; otpauthUrl: string };

/** O que o cartão está a mostrar. `codes` = códigos de recuperação acabados
 * de gerar (única vez em claro); `confirm` = pedir um código antes de
 * desligar ou de gerar novos códigos. */
type View =
  | { kind: "loading" }
  | { kind: "off" }
  | { kind: "setup"; setup: Setup }
  | { kind: "codes"; codes: string[] }
  | { kind: "on" }
  | { kind: "confirm"; action: "disable" | "regenerate" };

/**
 * Verificação em dois passos OPCIONAL da conta da equipa do restaurante
 * (backend StaffTwoFactorController) — é da PESSOA, não do restaurante, por
 * isso fica num cartão próprio no fim de /admin/perfil. Não aparece quando é
 * um operador Luku a ver o painel (sessão emprestada, com o 2FA de sistema).
 */
export function StaffTwoFactorCard() {
  const { t } = useTranslation();
  const [view, setView] = useState<View>({ kind: "loading" });
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const hidden = !hasRealBackend || isOperatorAdminSession();

  useEffect(() => {
    const token = getAdminToken();
    if (hidden || !token) return;
    apiFetch<{ data: { twoFactorEnabled?: boolean } }>("/auth/me", { token })
      .then(({ data }) => setView({ kind: data.twoFactorEnabled ? "on" : "off" }))
      .catch(() => setView({ kind: "off" }));
  }, [hidden]);

  if (hidden || view.kind === "loading") return null;

  const call = async <T,>(path: string, body?: Record<string, string>) => {
    const token = getAdminToken();
    const { data } = await apiFetch<{ data: T }>(path, {
      method: "POST",
      token,
      ...(body ? { body } : {}),
    });
    return data;
  };

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t("adminPerfil.twoFactor.error"));
    } finally {
      setBusy(false);
      setCode("");
    }
  };

  const start = () =>
    run(async () => setView({ kind: "setup", setup: await call<Setup>("/auth/2fa/setup") }));

  const confirm = (e: React.FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const { recoveryCodes } = await call<{ recoveryCodes: string[] }>("/auth/2fa/confirm", {
        code,
      });
      setView({ kind: "codes", codes: recoveryCodes });
      toast.success(t("adminPerfil.twoFactor.enabledToast"));
    });
  };

  const confirmAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (view.kind !== "confirm") return;
    const action = view.action;
    void run(async () => {
      if (action === "disable") {
        await call("/auth/2fa/disable", { code });
        setView({ kind: "off" });
        toast.success(t("adminPerfil.twoFactor.disabledToast"));
      } else {
        const { recoveryCodes } = await call<{ recoveryCodes: string[] }>(
          "/auth/2fa/recovery-codes",
          { code },
        );
        setView({ kind: "codes", codes: recoveryCodes });
      }
    });
  };

  const codeInput = (
    <Input
      required
      autoFocus
      autoComplete="one-time-code"
      inputMode="numeric"
      maxLength={6}
      value={code}
      onChange={(e) => setCode(e.target.value.trim())}
      placeholder={t("sistema.entrar.twoFactor.codePlaceholder")}
      className="tracking-widest"
    />
  );

  return (
    <section className="card-soft p-5 sm:p-6">
      <div className="flex items-start gap-3 border-b border-border pb-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-base font-bold text-foreground">
            {t("adminPerfil.twoFactor.title")}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("adminPerfil.twoFactor.hint")}</p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {view.kind === "off" && (
          <>
            <p className="text-sm text-foreground">{t("adminPerfil.twoFactor.offDescription")}</p>
            <Button type="button" onClick={start} disabled={busy} className="rounded-xl">
              {t("adminPerfil.twoFactor.enable")}
            </Button>
          </>
        )}

        {view.kind === "setup" && (
          <form onSubmit={confirm} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("adminPerfil.twoFactor.setupDescription")}
            </p>
            <div className="flex justify-center rounded-xl border border-border bg-white p-4 sm:justify-start">
              <QRCodeSVG value={view.setup.otpauthUrl} size={168} />
            </div>
            <p className="text-xs text-muted-foreground">
              {t("sistema.entrar.twoFactor.manualKey")}{" "}
              <code className="break-all font-mono text-foreground">{view.setup.secret}</code>
            </p>
            {codeInput}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={busy} className="rounded-xl">
                {t("adminPerfil.twoFactor.activate")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setView({ kind: "off" })}
                className="rounded-xl"
              >
                {t("common.cancel")}
              </Button>
            </div>
          </form>
        )}

        {view.kind === "codes" && (
          <>
            <p className="text-sm font-semibold text-foreground">
              {t("sistema.entrar.twoFactor.recoveryTitle")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("sistema.entrar.twoFactor.recoveryCodesDescription")}
            </p>
            <ul className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-surface p-4 font-mono text-sm text-foreground">
              {view.codes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  navigator.clipboard?.writeText(view.codes.join("\n")).then(
                    () => toast.success(t("sistema.entrar.twoFactor.copied")),
                    () => undefined,
                  )
                }
                className="rounded-xl"
              >
                <Copy className="mr-1.5 h-4 w-4" /> {t("sistema.entrar.twoFactor.copy")}
              </Button>
              <Button type="button" onClick={() => setView({ kind: "on" })} className="rounded-xl">
                {t("adminPerfil.twoFactor.savedDone")}
              </Button>
            </div>
          </>
        )}

        {view.kind === "on" && (
          <>
            <p className="text-sm text-foreground">{t("adminPerfil.twoFactor.onDescription")}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setView({ kind: "confirm", action: "regenerate" })}
                className="rounded-xl"
              >
                {t("adminPerfil.twoFactor.regenerate")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setView({ kind: "confirm", action: "disable" })}
                className="rounded-xl text-destructive hover:text-destructive"
              >
                {t("adminPerfil.twoFactor.disable")}
              </Button>
            </div>
          </>
        )}

        {view.kind === "confirm" && (
          <form onSubmit={confirmAction} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {view.action === "disable"
                ? t("adminPerfil.twoFactor.confirmDisable")
                : t("adminPerfil.twoFactor.confirmRegenerate")}
            </p>
            {codeInput}
            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                disabled={busy}
                variant={view.action === "disable" ? "destructive" : "default"}
                className="rounded-xl"
              >
                {view.action === "disable"
                  ? t("adminPerfil.twoFactor.disable")
                  : t("adminPerfil.twoFactor.regenerate")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setView({ kind: "on" })}
                className="rounded-xl"
              >
                {t("common.cancel")}
              </Button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
