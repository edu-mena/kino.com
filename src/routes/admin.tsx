import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin-shell";
import { OperatorProviders } from "@/lib/operator-providers";

/**
 * Layout do painel do restaurante — envolve todas as rotas `/admin/*`
 * (exceto `/admin/entrar`, que fica fora por não ter sessão ainda; ver
 * `admin_.entrar.tsx`, o escape hatch do underscore evita que ela também
 * fique aninhada aqui). `AdminShell` faz o redirect pra `/admin/entrar`
 * quando não há restaurante escolhido.
 */
export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <OperatorProviders>
      <AdminShell>
        <Outlet />
      </AdminShell>
    </OperatorProviders>
  );
}
