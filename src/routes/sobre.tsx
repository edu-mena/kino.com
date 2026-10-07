import { createFileRoute, Link } from "@tanstack/react-router";
import { Quote, Star, Store, UtensilsCrossed, Users } from "lucide-react";
import icon from "@/assets/icon.png";
import { PageHeading, PageShell, SiteHeader } from "@/components/site-shell";
import { useTranslation } from "@/i18n";
import { formatCount } from "@/lib/format";
import { useGuestContent, useSiteContentPublic, useSiteStats } from "@/lib/site-content";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre a Luku — quem somos" },
      {
        name: "description",
        content:
          "A Luku é o cardápio digital de Angola: quem está por trás, os números da plataforma e quem já confia na gente.",
      },
      { property: "og:title", content: "Sobre a Luku — quem somos" },
      {
        property: "og:description",
        content: "O cardápio digital que liga restaurantes e clientes em Angola.",
      },
      { property: "og:image", content: icon },
    ],
  }),
  component: Sobre,
});

const partners = [
  "Luku Grill",
  "Forno da Ilha",
  "Sabores de Luanda",
  "Doce Baía",
  "Talatona Sushi",
  "Maianga Grill",
  "Miramar Bistro",
  "Ilha Café",
];

function Sobre() {
  const { t } = useTranslation();
  const { content } = useSiteContentPublic();
  // Títulos/botões editáveis em /sistema/conteudo → "Páginas públicas".
  const { text: gt } = useGuestContent();
  const stats = useSiteStats();

  const settings = content?.settings;
  const team = content?.team ?? [];
  const testimonials = content?.testimonials ?? [];

  // Ícone de cada estatística fica fixo no frontend (o backend só devolve o
  // número real) — ver SystemStatsController::siteStats.
  const statCards = stats
    ? [
        {
          icon: Users,
          value: formatCount(stats.activeCustomers),
          label: gt("sobre.statActiveCustomers"),
        },
        {
          icon: Store,
          value: formatCount(stats.partnerRestaurants),
          label: gt("sobre.statPartnerRestaurants"),
        },
        {
          icon: UtensilsCrossed,
          value: formatCount(stats.menuDishes),
          label: gt("sobre.statMenuDishes"),
        },
        { icon: Star, value: stats.averageRating.toFixed(1), label: gt("sobre.statAverageRating") },
      ]
    : [];

  return (
    <PageShell header={<SiteHeader variant="guestHome" />} footer={null} showMobileTabBar={false}>
      <PageHeading
        eyebrow={settings?.aboutEyebrow || t("sobre.eyebrow")}
        title={settings?.aboutTitle || t("sobre.title")}
        description={settings?.aboutDescription || t("sobre.description")}
      />

      {/* Hero — imagem ou vídeo de destaque, editável em /sistema/conteudo.
          Só aparece quando preenchido (nunca por omissão). */}
      {settings?.aboutHeroImageUrl && settings.processingStatus === "ready" && (
        <section className="mx-auto mt-10 max-w-6xl px-4 md:px-6">
          <div className="overflow-hidden rounded-[2rem] bg-surface">
            {settings.aboutHeroMediaType === "video" ? (
              <video
                src={settings.aboutHeroImageUrl}
                poster={settings.aboutHeroThumbnailUrl ?? undefined}
                controls
                className="aspect-video w-full object-cover"
              />
            ) : (
              <img
                src={settings.aboutHeroImageUrl}
                alt=""
                className="aspect-video w-full object-cover"
              />
            )}
          </div>
        </section>
      )}

      {/* Team */}
      {team.length > 0 && (
        <section className="mx-auto mt-14 max-w-6xl px-4 md:px-6">
          <h2 className="text-2xl font-extrabold text-primary">{gt("sobre.teamHeading")}</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {team.map((person) => (
              <div
                key={person.id}
                className="flex items-center gap-4 rounded-[2rem] border border-border bg-card p-6"
              >
                <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-primary font-display text-lg font-bold text-primary-foreground">
                  {person.photoUrl ? (
                    <img src={person.photoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    person.initials
                  )}
                </span>
                <div>
                  <h3 className="font-display text-lg font-bold text-primary">{person.name}</h3>
                  <p className="text-sm text-muted-foreground">{person.role}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Stats */}
      {statCards.length > 0 && (
        <section className="mx-auto mt-14 max-w-6xl px-4 md:px-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {statCards.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-border bg-card p-5 text-left"
              >
                <stat.icon className="h-8 w-8 text-brand" />
                <p className="mt-4 font-display text-3xl font-extrabold text-primary">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Partners marquee */}
      <section className="mx-auto mt-14 max-w-6xl px-4 md:px-6">
        <h2 className="text-2xl font-extrabold text-primary">{gt("sobre.partnersHeading")}</h2>
      </section>
      <div className="relative mt-5 overflow-hidden py-2 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        <div className="flex w-max animate-marquee gap-4">
          {[...partners, ...partners].map((name, i) => (
            <span
              key={`${name}-${i}`}
              className="shrink-0 rounded-full border border-border bg-card px-6 py-3 font-display text-sm font-bold tracking-wide text-primary"
            >
              {name}
            </span>
          ))}
        </div>
      </div>

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section className="mx-auto mb-20 mt-14 max-w-6xl px-4 md:px-6">
          <h2 className="text-2xl font-extrabold text-primary">
            {gt("sobre.testimonialsHeading")}
          </h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {testimonials.map((item) => (
              <div
                key={item.id}
                className="flex flex-col rounded-[2rem] border border-border bg-card p-6"
              >
                <Quote className="h-6 w-6 text-brand" />
                <p className="mt-3 flex-1 text-sm text-foreground">{item.quote}</p>
                <div className="mt-5 flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-surface font-display text-sm font-bold text-primary">
                    {item.photoUrl ? (
                      <img src={item.photoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      item.initials
                    )}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Call to action — a página descreve a Luku mas, até aqui, não dava
          nenhum próximo passo; fecha com os mesmos dois caminhos usados
          em /luku (virar parceiro ou entrar como cliente). */}
      <section className="mx-auto mb-20 mt-14 max-w-6xl px-4 md:px-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col items-start gap-4 rounded-[2rem] bg-surface p-8 sm:p-10">
            <h2 className="font-display text-2xl font-extrabold text-primary sm:text-3xl">
              {gt("luku.ctaRestaurantTitle")}
            </h2>
            <p className="max-w-sm text-muted-foreground">{gt("luku.ctaRestaurantDescription")}</p>
            <Link
              to="/parceiros"
              className="mt-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90"
            >
              {gt("sobre.becomePartner")}
            </Link>
          </div>

          <div className="flex flex-col items-start gap-4 rounded-[2rem] bg-primary p-8 text-primary-foreground sm:p-10">
            <h2 className="font-display text-2xl font-extrabold sm:text-3xl">
              {gt("luku.ctaCustomerTitle")}
            </h2>
            <p className="max-w-sm text-primary-foreground/85">
              {gt("luku.ctaCustomerDescription")}
            </p>
            <Link
              to="/entrar"
              className="mt-2 rounded-full bg-background px-6 py-3 text-sm font-semibold text-primary transition-opacity hover:opacity-90"
            >
              {gt("luku.login")}
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
