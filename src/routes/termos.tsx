import { createFileRoute, Link } from "@tanstack/react-router";
import icon from "@/assets/icon.png";
import { LegalDocument, LegalSection } from "@/components/legal-page";
import { PageHeading, PageShell, SiteHeader } from "@/components/site-shell";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Serviço — Luku.com" },
      { name: "robots", content: "noindex" },
      {
        name: "description",
        content: "Termos de uso da Luku — como os pedidos, reservas e contas funcionam.",
      },
      { property: "og:title", content: "Termos de Serviço — Luku.com" },
      { property: "og:image", content: icon },
    ],
  }),
  component: Termos,
});

function Termos() {
  return (
    <PageShell header={<SiteHeader variant="guestHome" />} footer={null} showMobileTabBar={false}>
      <PageHeading eyebrow="Legal" title="Termos de Serviço" />

      <LegalDocument
        updatedAt="13 de setembro de 2026"
        intro={
          <p>
            Estes termos regem o uso da Luku — o site, e as apps Android e iOS (em conjunto, o
            "Serviço"). Ao criar uma conta ou usar o Serviço, concorda com o que está escrito
            abaixo. Se representa um restaurante, aceita também em nome desse restaurante.
          </p>
        }
      >
        <LegalSection title="1. O que é a Luku">
          <p>
            A Luku é uma plataforma que liga clientes a restaurantes independentes em Angola, para
            pedidos de entrega/take-away e reservas de mesa. A Luku disponibiliza o cardápio
            digital, o sistema de pedidos e reservas, e a comunicação entre cliente e restaurante —
            mas <strong>não é dona de nenhum restaurante listado</strong>, não prepara nem entrega
            comida, e cada restaurante é responsável pelo seu próprio cardápio, preços, horários e
            qualidade de serviço.
          </p>
        </LegalSection>

        <LegalSection title="2. Contas">
          <p>
            <strong>Clientes</strong> entram só com uma conta Google — não existe registo por email
            e senha para este tipo de conta. É responsável por manter o acesso à sua conta Google
            seguro; qualquer atividade feita a partir dela é considerada sua.
          </p>
          <p>
            <strong>Restaurantes parceiros</strong> não se registam sozinhos: uma conta só é criada
            depois de a Luku aprovar um pedido de parceria (ver{" "}
            <Link to="/parceiros" className="font-semibold text-primary hover:underline">
              /parceiros
            </Link>
            ), com email e senha próprios. O dono do restaurante pode convidar outros membros da
            equipa e é responsável pelo que essa equipa publica ou altera em nome do restaurante.
          </p>
        </LegalSection>

        <LegalSection title="3. Pedidos e reservas">
          <p>
            Ao fazer um pedido ou reserva, está a contratar diretamente com o restaurante — a Luku
            facilita a transação, mas o contrato de compra e venda (ou de reserva de mesa) é entre o
            cliente e o restaurante.
          </p>
          <p>
            <strong>A Luku não processa pagamentos.</strong> Cada restaurante escolhe os seus
            próprios métodos de pagamento aceites (ex.: transferência bancária, Multicaixa Express,
            numerário à entrega) e o pagamento é acertado diretamente entre cliente e restaurante,
            fora da app. A Luku pode pedir o envio de um comprovativo de pagamento dentro da app
            para o restaurante confirmar o pedido, mas nunca guarda dados de cartão nem movimenta
            dinheiro entre as partes.
          </p>
          <p>
            Alguns restaurantes exigem uma <strong>caução</strong> (um valor de garantia) para
            certos modos de pedido ou reserva — isso é decidido pelo próprio restaurante, mostrado
            antes de confirmar, e as condições de reembolso/perda da caução em caso de cancelamento
            ou não comparência são definidas por esse restaurante, não pela Luku.
          </p>
          <p>
            Preços, disponibilidade, tempos de preparação/entrega e horários de reserva são geridos
            pelo restaurante e podem mudar sem aviso prévio — a app pode demorar a refletir isso.
          </p>
        </LegalSection>

        <LegalSection title="4. As suas responsabilidades">
          <p>
            Fornecer dados de contacto corretos (nome, telefone, morada de entrega) para que o
            pedido/reserva possa ser cumprido; comparecer às reservas feitas ou cancelá-las com
            antecedência razoável; pagar o que for devido ao restaurante nos termos combinados; e
            não usar o Serviço para fins ilegais, fraudulentos, ou para assediar restaurantes/outros
            utilizadores.
          </p>
        </LegalSection>

        <LegalSection title="5. Avaliações e conteúdo enviado">
          <p>
            Só pode avaliar um pedido ou reserva que tenha mesmo concluído — a Luku valida isso
            antes de publicar a avaliação. Avaliações devem refletir uma experiência real e genuína;
            a Luku pode remover conteúdo ofensivo, falso, ou que viole estes termos, e suspender
            contas que publiquem avaliações fraudulentas repetidamente.
          </p>
        </LegalSection>

        <LegalSection title="6. Limitação de responsabilidade">
          <p>
            A Luku esforça-se para manter o Serviço disponível e correto, mas não garante que a
            comida encomendada, o tempo de entrega, ou a experiência na reserva correspondam
            exatamente ao esperado — essa responsabilidade é do restaurante que presta o serviço. Na
            medida permitida por lei, a Luku não é responsável por danos indiretos resultantes do
            uso do Serviço ou de disputas entre cliente e restaurante.
          </p>
        </LegalSection>

        <LegalSection title="7. Suspensão e encerramento">
          <p>
            A Luku pode suspender ou encerrar uma conta que viole estes termos, sem aviso prévio em
            casos graves (fraude, ameaças, abuso do sistema). Pode encerrar a sua própria conta a
            qualquer momento — ver{" "}
            <Link to="/privacidade" className="font-semibold text-primary hover:underline">
              Política de Privacidade
            </Link>{" "}
            para como pedir a eliminação dos seus dados.
          </p>
        </LegalSection>

        <LegalSection title="8. Alterações a estes termos">
          <p>
            Podemos atualizar estes termos à medida que o Serviço evolui — a data no topo desta
            página reflete a versão em vigor. Mudanças relevantes serão comunicadas na app antes de
            entrarem em vigor.
          </p>
        </LegalSection>

        <LegalSection title="9. Lei aplicável">
          <p>
            Estes termos regem-se pela lei angolana. Qualquer litígio será, sempre que possível,
            resolvido diretamente entre as partes antes de recorrer aos tribunais competentes de
            Angola.
          </p>
        </LegalSection>

        <LegalSection title="10. Contacto">
          <p>
            Dúvidas sobre estes termos:{" "}
            <a href="mailto:ola@luku.com" className="font-semibold text-primary hover:underline">
              ola@luku.com
            </a>{" "}
            ou pela página de{" "}
            <Link to="/contacto" className="font-semibold text-primary hover:underline">
              Contacto
            </Link>
            .
          </p>
        </LegalSection>
      </LegalDocument>
    </PageShell>
  );
}
