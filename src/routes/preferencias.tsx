import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import icon from "@/assets/icon.png";
import { PageHeading, PageShell } from "@/components/site-shell";

export const Route = createFileRoute("/preferencias")({
  head: () => ({
    meta: [
      { title: "Preferências — Kino.com" },
      {
        name: "description",
        content: "Faixa de preço, cozinhas favoritas, localização e serviços preferidos.",
      },
      { property: "og:title", content: "Preferências — Kino.com" },
      { property: "og:image", content: icon },
    ],
  }),
  component: Preferencias,
});

function Preferencias() {
  return (
    <PageShell>
      <PageHeading
        eyebrow="Preferências"
        title="Preferências"
        description="Faixa de preço, tipos de cozinha, localizações e serviços preferidos."
      />
      <div className="mx-auto mt-8 max-w-6xl px-4 md:px-6">
        <div className="card-soft grid place-items-center gap-3 p-12 text-center">
          <Settings className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Em breve vai poder ajustar aqui tudo o que prefere — por agora, as suas restrições
            alimentares já ficam guardadas a partir do banner na página inicial.
          </p>
        </div>
      </div>
    </PageShell>
  );
}
