import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Bell,
  Bike,
  BookOpen,
  CalendarCheck,
  MapPin,
  Megaphone,
  MousePointerClick,
  Play,
  QrCode,
  SlidersHorizontal,
  UtensilsCrossed,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import icon from "@/assets/icon.png";
import { PageShell, SiteHeader } from "@/components/site-shell";
import { GUEST_MEDIA_DEFAULTS, LUKU_VIDEO_DEFAULT } from "@/lib/guest-content-fields";
import { useGuestContent } from "@/lib/site-content";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/luku")({
  head: () => ({
    meta: [
      { title: "Luku.com — o cardápio digital de Angola" },
      {
        name: "description",
        content:
          "A Luku é o cardápio digital que liga restaurantes e clientes: pratos, preços, mesas e pedidos, tudo num só lugar.",
      },
      { property: "og:title", content: "Luku.com — o cardápio digital de Angola" },
      { property: "og:image", content: icon },
    ],
  }),
  component: Luku,
});

function ExpandableIllustration({
  src,
  alt,
  title,
  description,
  className,
}: {
  src: string;
  alt: string;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "group relative h-40 overflow-hidden rounded-[2rem] bg-white p-4 transition-transform hover:scale-[1.02]",
            className,
          )}
        >
          <span className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform group-hover:scale-110">
            <MousePointerClick className="h-4 w-4" />
          </span>
          <img
            src={src}
            alt={alt}
            className="absolute left-1/2 top-1/2 max-h-[calc(100%-2rem)] max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 object-contain"
          />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-[2rem] border-none bg-card p-8 text-center">
        <img src={src} alt={alt} className="mx-auto h-40 w-40 object-contain" />
        <DialogTitle className="mt-4 font-display text-xl font-bold text-primary">
          {title}
        </DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">
          {description}
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
}

function Luku() {
  const videoSectionRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const { t } = useTranslation();
  // Textos/imagens/vídeo editáveis em /sistema/conteudo → "Páginas
  // públicas"; sem edição fica o original (ver useGuestContent).
  const { text: gt, media, lukuVideo: customVideo } = useGuestContent();
  const heroImage = media("luku.heroImage", GUEST_MEDIA_DEFAULTS["luku.heroImage"]);
  const videoSrc = customVideo?.src ?? LUKU_VIDEO_DEFAULT;
  const videoPoster = customVideo?.poster ?? heroImage;

  const forCustomers = [
    { icon: MapPin, text: gt("luku.forCustomer1") },
    { icon: BookOpen, text: gt("luku.forCustomer2") },
    { icon: CalendarCheck, text: gt("luku.forCustomer3") },
    { icon: Bike, text: gt("luku.forCustomer4") },
    { icon: SlidersHorizontal, text: gt("luku.forCustomer5") },
    { icon: Bell, text: gt("luku.forCustomer6") },
  ];

  const forRestaurants = [
    { icon: QrCode, text: gt("luku.forRestaurant1") },
    { icon: UtensilsCrossed, text: gt("luku.forRestaurant2") },
    { icon: CalendarCheck, text: gt("luku.forRestaurant3") },
    { icon: Megaphone, text: gt("luku.forRestaurant4") },
    { icon: Users, text: gt("luku.forRestaurant5") },
  ];

  useEffect(() => {
    const el = videoSectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const inView = entries[0]?.isIntersecting ?? false;
        // O vídeo tem preload="none" (14 MB) — só começa a carregar/tocar
        // quando entra no ecrã, e pausa ao sair para não gastar rede/bateria.
        const video = videoRef.current;
        if (video) {
          if (inView) {
            void video
              .play()
              .then(() => setPlaying(true))
              .catch(() => {});
          } else if (!video.paused) {
            video.pause();
            setPlaying(false);
          }
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scrollToVideo = () => {
    videoSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  const toggleMuted = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  return (
    <PageShell header={<SiteHeader variant="guestHome" />} footer={null} showMobileTabBar={false}>
      {/* Bento grid */}
      <section className="mx-auto mt-12 max-w-6xl px-4 md:px-6">
        <div className="grid auto-rows-[10rem] grid-cols-2 gap-4 md:grid-cols-4">
          {/* Coluna esquerda: imagem + "Restaurantes perto de si" coladas,
              como um só cartão — a imagem enche a largura da coluna e toda a
              altura entre as duas linhas até tocar no cartão verde. */}
          <div className="col-span-2 row-span-3 flex flex-col overflow-hidden rounded-[2rem]">
            <button
              type="button"
              onClick={scrollToVideo}
              aria-label={t("luku.playVideoAria")}
              className="group min-h-0 flex-1"
            >
              <img
                src={heroImage}
                alt="Ilustração Luku.com"
                className="h-full w-full object-cover"
              />
            </button>

            <button
              type="button"
              onClick={scrollToVideo}
              className="flex shrink-0 flex-col justify-center bg-primary p-6 text-left text-primary-foreground"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15">
                <MapPin className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-display text-xl font-bold">{gt("luku.nearYouTitle")}</h3>
              <p className="mt-2 text-sm text-primary-foreground/80">
                {gt("luku.nearYouDescription")}
              </p>
            </button>
          </div>

          <div className="col-span-2 flex flex-col justify-center rounded-[2rem] border border-border bg-card p-6">
            <h3 className="font-display text-xl font-bold text-primary">{gt("luku.bentoTitle")}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{gt("luku.bentoDescription")}</p>
          </div>

          <ExpandableIllustration
            src={media("luku.illustration1Image", GUEST_MEDIA_DEFAULTS["luku.illustration1Image"])}
            alt={gt("luku.illustration1Alt")}
            title={gt("luku.illustration1Title")}
            description={gt("luku.illustration1Description")}
            className="col-span-1 row-span-1"
          />
          <ExpandableIllustration
            src={media("luku.illustration2Image", GUEST_MEDIA_DEFAULTS["luku.illustration2Image"])}
            alt={gt("luku.illustration2Alt")}
            title={gt("luku.illustration2Title")}
            description={gt("luku.illustration2Description")}
            className="col-span-1 row-span-1"
          />

          <ExpandableIllustration
            src={media("luku.illustration3Image", GUEST_MEDIA_DEFAULTS["luku.illustration3Image"])}
            alt={gt("luku.illustration3Alt")}
            title={gt("luku.illustration3Title")}
            description={gt("luku.illustration3Description")}
            className="col-span-2 row-span-1"
          />
        </div>
      </section>

      {/* Call to action */}
      <section className="mx-auto mb-20 mt-16 max-w-6xl px-4 md:px-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col items-start gap-4 rounded-[2rem] bg-surface p-8 sm:p-10">
            <h2 className="font-display text-2xl font-extrabold text-primary sm:text-3xl">
              {gt("luku.ctaRestaurantTitle")}
            </h2>
            <p className="max-w-sm text-muted-foreground">{gt("luku.ctaRestaurantDescription")}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Link
                to="/parceiros"
                className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90"
              >
                {gt("luku.restaurantLogin")}
              </Link>
            </div>
          </div>

          <div className="flex flex-col items-start gap-4 rounded-[2rem] bg-primary p-8 text-primary-foreground sm:p-10">
            <h2 className="font-display text-2xl font-extrabold sm:text-3xl">
              {gt("luku.ctaCustomerTitle")}
            </h2>
            <p className="max-w-sm text-primary-foreground/85">
              {gt("luku.ctaCustomerDescription")}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Link
                to="/entrar"
                className="rounded-full bg-background px-6 py-3 text-sm font-semibold text-primary transition-opacity hover:opacity-90"
              >
                {gt("luku.login")}
              </Link>
              <Link
                to="/cardapio"
                className="rounded-full border border-primary-foreground/30 px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:border-primary-foreground"
              >
                {gt("luku.seeMenu")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto mt-16 max-w-6xl px-4 md:px-6">
        <h2 className="text-2xl font-extrabold text-primary">{gt("luku.featuresTitle")}</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="grid gap-4">
            <div className="flex flex-col rounded-[2rem] border border-border bg-card p-6 sm:p-8">
              <h3 className="font-display text-lg font-bold text-primary">
                {gt("luku.forCustomersTitle")}
              </h3>
              <ul className="mt-4 space-y-3">
                {forCustomers.map((item) => (
                  <li key={item.text} className="flex items-start gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-background text-brand">
                      <item.icon className="h-4 w-4" />
                    </span>
                    <span className="pt-1.5 text-sm text-foreground">{item.text}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/entrar"
                className="mt-6 inline-flex items-center gap-1 self-start rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                {gt("luku.login")} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="flex flex-col rounded-[2rem] border border-border bg-card p-6 sm:p-8">
              <h3 className="font-display text-lg font-bold text-primary">
                {gt("luku.forRestaurantsTitle")}
              </h3>
              <ul className="mt-4 space-y-3">
                {forRestaurants.map((item) => (
                  <li key={item.text} className="flex items-start gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-background text-brand">
                      <item.icon className="h-4 w-4" />
                    </span>
                    <span className="pt-1.5 text-sm text-foreground">{item.text}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/parceiros"
                className="mt-6 inline-flex items-center gap-1 self-start rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90"
              >
                {gt("luku.restaurantLogin")} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div
            ref={videoSectionRef}
            className="relative aspect-[9/16] overflow-hidden rounded-[2rem] bg-neutral-200 md:aspect-auto md:h-full"
          >
            <button
              type="button"
              onClick={togglePlay}
              aria-label={playing ? t("luku.pauseVideoAria") : t("luku.playVideoAria2")}
              className="absolute inset-0 z-10 grid place-items-center"
            >
              <video
                ref={videoRef}
                src={videoSrc}
                loop
                muted={muted}
                playsInline
                preload="none"
                poster={videoPoster}
                className="h-full w-full object-cover"
              />
              {!playing && (
                <span className="absolute grid h-14 w-14 place-items-center rounded-full bg-black/50 text-white backdrop-blur-sm">
                  <Play className="h-6 w-6 translate-x-0.5 fill-current" />
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleMuted();
              }}
              aria-label={muted ? t("luku.unmuteAria") : t("luku.muteAria")}
              className="absolute bottom-3 right-3 z-20 grid h-9 w-9 place-items-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-transform hover:scale-110"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
