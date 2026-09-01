import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SystemShell } from "@/components/system-shell";

/**
 * Layout da área de administração de sistema — envolve todas as rotas
 * `/sistema/*` (exceto `/sistema/entrar`, fora do layout via `sistema_`).
 * `SystemShell` redireciona para `/sistema/entrar` sem sessão de operador.
 */
export const Route = createFileRoute("/sistema")({
  component: SystemLayout,
});

function SystemLayout() {
  return (
    <SystemShell>
      <Outlet />
    </SystemShell>
  );
}
