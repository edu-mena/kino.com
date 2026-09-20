import { createFileRoute, Link } from "@tanstack/react-router";
import icon from "@/assets/icon.png";
import { LegalDocument, LegalSection } from "@/components/legal-page";
import { PageHeading, PageShell, SiteHeader } from "@/components/site-shell";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — Luku.com" },
      { name: "robots", content: "noindex" },
      {
        name: "description",
        content: "Que dados a Luku recolhe, para quê, e como pedir a sua eliminação.",
      },
      { property: "og:title", content: "Política de Privacidade — Luku.com" },
      { property: "og:image", content: icon },
    ],
  }),
  component: Privacidade,
});

function Privacidade() {
  return (
    <PageShell header={<SiteHeader variant="guestHome" />} footer={null} showMobileTabBar={false}>
      <PageHeading eyebrow="Legal" title="Política de Privacidade" />

      <LegalDocument
        updatedAt="13 de setembro de 2026"
        intro={
          <p>
            Esta política explica que dados a Luku recolhe quando usa o site ou as apps, para que
            servem, com quem são partilhados, e como pode pedir para os ver ou apagar. Escrita em
            linguagem direta de propósito — sem jargão desnecessário.
          </p>
        }
      >
        <LegalSection title="1. Dados que recolhemos">
          <p>
            <strong>Ao entrar com a Google (clientes):</strong> nome, email e foto de perfil, tal
            como a sua conta Google os disponibiliza — nunca a sua senha da Google, que a Luku nunca
            chega a ver.
          </p>
          <p>
            <strong>Que nos dá diretamente:</strong> telefone, moradas de entrega guardadas,
            preferências alimentares, e o conteúdo de pedidos, reservas e avaliações que fizer.
          </p>
          <p>
            <strong>Da equipa de restaurante/sistema:</strong> nome e email (contas criadas por
            convite, nunca autorregisto).
          </p>
          <p>
            <strong>Automaticamente:</strong> endereço IP e tipo de dispositivo/navegador — usados
            para segurança (ex.: detetar tentativas de acesso indevido ao painel de gestão) e para
            perceber falhas técnicas, nunca para publicidade.
          </p>
        </LegalSection>

        <LegalSection title="2. O que NÃO recolhemos">
          <p>
            A Luku não processa pagamentos — por isso <strong>nunca</strong> recolhemos número de
            cartão, dados bancários, ou qualquer credencial de pagamento. Comprovativos de pagamento
            que envie ficam visíveis apenas ao restaurante do pedido em causa.
          </p>
        </LegalSection>

        <LegalSection title="3. Para que usamos os dados">
          <p>
            Para processar pedidos e reservas e pôr o restaurante certo em contacto consigo; para
            autenticar a sua conta; para lhe mostrar o estado dos seus pedidos e notificações; para
            recomendar restaurantes com base nas suas preferências; e para segurança da plataforma
            (ex.: alertas de acesso indevido ao painel de sistema, bloqueio de endereços que tentem
            entrar em força).
          </p>
        </LegalSection>

        <LegalSection title="4. Com quem partilhamos">
          <p>
            <strong>O restaurante do seu pedido/reserva</strong> — recebe o necessário para preparar
            e entregar/servir o que pediu (nome, contacto, morada quando aplicável).
          </p>
          <p>
            <strong>Google</strong> — para autenticação, quando escolhe entrar com essa conta.
          </p>
          <p>
            <strong>Fornecedores técnicos que operam a plataforma em nosso nome</strong> (alojamento
            do servidor, armazenamento de imagens, envio de email) — só têm acesso ao estritamente
            necessário para o serviço funcionar, nunca podem usar os seus dados para outro fim.
          </p>
          <p>Nunca vendemos os seus dados a terceiros nem os usamos para publicidade externa.</p>
        </LegalSection>

        <LegalSection title="5. Onde ficam guardados">
          <p>
            Os seus dados ficam numa base de dados própria da Luku, protegida por acesso autenticado
            — nunca em folhas de cálculo soltas nem partilhadas por email.
          </p>
        </LegalSection>

        <LegalSection title="6. Os seus direitos">
          <p>
            Pode pedir para ver que dados temos sobre si, corrigi-los, ou pedir a eliminação da sua
            conta e dos dados associados — escrevendo para{" "}
            <a href="mailto:ola@luku.com" className="font-semibold text-primary hover:underline">
              ola@luku.com
            </a>
            . Alguma informação (ex.: histórico de pedidos já concluídos) pode ter de ser mantida
            por mais tempo quando exigido por lei fiscal/comercial angolana, mesmo depois de pedir a
            eliminação da conta.
          </p>
        </LegalSection>

        <LegalSection title="7. Menores de idade">
          <p>
            O Serviço não se destina a menores de 13 anos. Se soubermos que recolhemos dados de uma
            criança com menos de 13 anos sem consentimento dos pais/encarregados de educação,
            eliminamos essa conta.
          </p>
        </LegalSection>

        <LegalSection title="8. Alterações a esta política">
          <p>
            Podemos atualizar esta política à medida que o Serviço evolui — a data no topo desta
            página reflete a versão em vigor.
          </p>
        </LegalSection>

        <LegalSection title="9. Contacto">
          <p>
            Sobre esta política ou os seus dados:{" "}
            <a href="mailto:ola@luku.com" className="font-semibold text-primary hover:underline">
              ola@luku.com
            </a>{" "}
            ou pela página de{" "}
            <Link to="/contacto" className="font-semibold text-primary hover:underline">
              Contacto
            </Link>
            . Ver também os{" "}
            <Link to="/termos" className="font-semibold text-primary hover:underline">
              Termos de Serviço
            </Link>
            .
          </p>
        </LegalSection>
      </LegalDocument>
    </PageShell>
  );
}
