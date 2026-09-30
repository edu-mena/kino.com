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
        updatedAt="30 de setembro de 2026"
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
            que envie (e as faturas que o restaurante lhe emite) ficam em armazenamento privado,
            visíveis apenas a si e ao restaurante do pedido em causa, e só através de links
            temporários que deixam de funcionar ao fim de poucas horas.
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

        <LegalSection title="5. Onde ficam guardados e por quanto tempo">
          <p>
            Os seus dados ficam numa base de dados própria da Luku, protegida por acesso autenticado
            — nunca em folhas de cálculo soltas nem partilhadas por email.
          </p>
          <p>
            Enquanto tiver conta, guardamos o que é preciso para o Serviço funcionar. Alguns dados
            são apagados automaticamente mais cedo: notificações lidas ao fim de 6 meses (as não
            lidas ao fim de 12), o registo das visitas a perfis de restaurantes ao fim de 90 dias,
            mensagens enviadas pela página de Contacto e registos de segurança ao fim de 12 meses, e
            candidaturas de restaurantes recusadas ao fim de 6 meses.
          </p>
        </LegalSection>

        <LegalSection title="6. Os seus direitos">
          <p>
            No seu{" "}
            <Link to="/perfil" className="font-semibold text-primary hover:underline">
              Perfil
            </Link>{" "}
            pode, a qualquer momento e sem pedir a ninguém, <strong>descarregar</strong> tudo o que
            a Luku guarda sobre si e <strong>apagar a sua conta</strong> (ver{" "}
            <Link to="/eliminar-conta" className="font-semibold text-primary hover:underline">
              como apagar a conta
            </Link>
            ). Para corrigir dados ou qualquer outro pedido, escreva para{" "}
            <a href="mailto:ola@luku.ao" className="font-semibold text-primary hover:underline">
              ola@luku.ao
            </a>
            . Ao apagar a conta, os pedidos e reservas já feitos ficam no histórico do restaurante
            (registo contabilístico/fiscal), mas sem o seu nome, contacto, morada nem notas.
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
            <a href="mailto:ola@luku.ao" className="font-semibold text-primary hover:underline">
              ola@luku.ao
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
