import { createFileRoute, Link } from "@tanstack/react-router";
import icon from "@/assets/icon.png";
import { LegalDocument, LegalSection } from "@/components/legal-page";
import { PageHeading, PageShell, SiteHeader } from "@/components/site-shell";

/**
 * Página pública de eliminação de conta — o Google Play exige um URL (fora da
 * app, acessível sem sessão) que explique como apagar a conta e que dados
 * saem/ficam; a Apple exige a opção dentro da app (Perfil → Apagar conta,
 * ver AccountDataActions). Auditoria de segurança, Fase 3.
 */
export const Route = createFileRoute("/eliminar-conta")({
  head: () => ({
    meta: [
      { title: "Apagar a sua conta — Luku.com" },
      {
        name: "description",
        content: "Como apagar a sua conta Luku e que dados são eliminados.",
      },
      { property: "og:title", content: "Apagar a sua conta — Luku.com" },
      { property: "og:image", content: icon },
    ],
  }),
  component: EliminarConta,
});

function EliminarConta() {
  return (
    <PageShell header={<SiteHeader variant="guestHome" />} footer={null} showMobileTabBar={false}>
      <PageHeading eyebrow="Conta" title="Apagar a sua conta" />

      <LegalDocument
        updatedAt="30 de setembro de 2026"
        intro={
          <p>
            Pode apagar a sua conta Luku a qualquer momento, sem pedir a ninguém. A eliminação é
            imediata e definitiva.
          </p>
        }
      >
        <LegalSection title="Como apagar">
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              Entre na Luku (site ou app) e abra o{" "}
              <Link to="/perfil" className="font-semibold text-primary hover:underline">
                Perfil
              </Link>
              .
            </li>
            <li>
              Toque em <strong>Apagar conta</strong>.
            </li>
            <li>
              Escreva <strong>APAGAR</strong> para confirmar e toque em{" "}
              <strong>Apagar a minha conta</strong>.
            </li>
          </ol>
          <p>
            Antes disso, se quiser uma cópia, use <strong>Descarregar os meus dados</strong> no
            mesmo sítio.
          </p>
        </LegalSection>

        <LegalSection title="O que é apagado">
          <p>
            A conta (nome, email, telefone, foto), moradas guardadas, empresas para fatura,
            favoritos, restaurantes que segue, preferências, notificações, as visitas que fez a
            perfis de restaurantes e as notas que os restaurantes tenham escrito sobre si.
          </p>
        </LegalSection>

        <LegalSection title="O que fica, sem o identificar">
          <p>
            Os pedidos e reservas que fez continuam no histórico do restaurante — valores, pratos e
            faturas são registo contabilístico dele — mas sem o seu nome, telefone, email, morada
            nem notas. As avaliações que escreveu ficam publicadas como “Cliente removido”.
          </p>
        </LegalSection>

        <LegalSection title="Sem acesso à conta?">
          <p>
            Escreva para{" "}
            <a href="mailto:ola@luku.ao" className="font-semibold text-primary hover:underline">
              ola@luku.ao
            </a>{" "}
            a partir do email da conta e apagamo-la por si. Contas de restaurante são encerradas
            pelo suporte (o restaurante tem de ser fechado primeiro). Ver também a{" "}
            <Link to="/privacidade" className="font-semibold text-primary hover:underline">
              Política de Privacidade
            </Link>
            .
          </p>
        </LegalSection>
      </LegalDocument>
    </PageShell>
  );
}
