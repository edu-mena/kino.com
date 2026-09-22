import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin-shell";
import { OperatorProviders } from "@/lib/operator-providers";
import { getAdminToken } from "@/lib/restaurant-admin";

/**
 * Layout do painel do restaurante — envolve todas as rotas `/admin/*`
 * (exceto `/admin/entrar`, que fica fora por não ter sessão ainda; ver
 * `admin_.entrar.tsx`, o escape hatch do underscore evita que ela também
 * fique aninhada aqui). `AdminShell` faz o redirect pra `/admin/entrar`
 * quando não há restaurante escolhido.
 */
export const Route = createFileRoute("/admin")({
  // Camada extra por cima do guard do `AdminShell` (que só corre num
  // `useEffect`, depois de validar o token contra `/auth/me` — por isso não
  // dá pra saber aqui se o token é válido, só se existe). Sem token nenhum,
  // corta o acesso direto já na navegação, em vez de deixar o `AdminShell`
  // renderizar `null` por um instante antes do efeito redirecionar.
  beforeLoad: () => {
    if (!getAdminToken()) throw redirect({ to: "/admin/entrar" });
  },
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
