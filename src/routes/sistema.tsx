import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { SystemShell } from "@/components/system-shell";
import { OperatorProviders } from "@/lib/operator-providers";
import { getSystemToken } from "@/lib/system-admin";

/**
 * Layout da área de administração de sistema — envolve todas as rotas
 * `/sistema/*` (exceto `/sistema/entrar`, fora do layout via `sistema_`).
 * `SystemShell` redireciona para `/sistema/entrar` sem sessão de operador.
 */
export const Route = createFileRoute("/sistema")({
  // Mesma camada extra de `/admin` (ver src/routes/admin.tsx) — só checa
  // presença do token, não validade (isso continua no `SystemShell`). Pula
  // no servidor (SSR): `getSystemToken()` aí nunca vê o localStorage do
  // browser, então sem este `if` todo F5 em `/sistema` fazia logout mesmo
  // com sessão válida (bug real, encontrado em produção).
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    if (!getSystemToken()) throw redirect({ to: "/sistema/entrar" });
  },
  component: SystemLayout,
});

function SystemLayout() {
  return (
    <OperatorProviders>
      <SystemShell>
        <Outlet />
      </SystemShell>
    </OperatorProviders>
  );
}
