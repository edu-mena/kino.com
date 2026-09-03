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
import chiefIllustration from "@/assets/kino/chief.png";
import dateIllustration from "@/assets/kino/date.png";
import kinoHero from "@/assets/kino/hero.webp";
import menuIllustration from "@/assets/kino/menu.png";
import pratoBg from "@/assets/kino/prato.png";
import kinoVideo from "@/assets/kino/video.mp4";
import { PageShell, SiteHeader } from "@/components/site-shell";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/kino")({
  head: () => ({
    meta: [
      { title: "Kino.com — o cardápio digital de Luanda" },
      {
        name: "description",
        content:
          "A Kino é o cardápio digital que liga restaurantes e clientes: pratos, preços, mesas e pedidos, tudo num só lugar.",
      },
      { property: "og:title", content: "Kino.com — o cardápio digital de Luanda" },
      { property: "og:image", content: icon },
    ],
  }),
  component: Kino,
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

function Kino() {
  const videoSectionRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [videoInView, setVideoInView] = useState(false);
  const { t } = useTranslation();

  const forCustomers = [
    { icon: MapPin, text: t("kino.forCustomer1") },
    { icon: BookOpen, text: t("kino.forCustomer2") },
    { icon: CalendarCheck, text: t("kino.forCustomer3") },
    { icon: Bike, text: t("kino.forCustomer4") },
    { icon: SlidersHorizontal, text: t("kino.forCustomer5") },
    { icon: Bell, text: t("kino.forCustomer6") },
  ];

  const forRestaurants = [
    { icon: QrCode, text: t("kino.forRestaurant1") },
    { icon: UtensilsCrossed, text: t("kino.forRestaurant2") },
    { icon: CalendarCheck, text: t("kino.forRestaurant3") },
    { icon: Megaphone, text: t("kino.forRestaurant4") },
    { icon: Users, text: t("kino.forRestaurant5") },
  ];

  // Hide the spinning plate whenever the video is on screen — with both
  // visible and both moving, the plate turns into a distracting element.
  useEffect(() => {
    const el = videoSectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const inView = entries[0]?.isIntersecting ?? false;
        setVideoInView(inView);
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
      <img
        src={pratoBg}
        alt=""
        aria-hidden
        className={cn(
          "pointer-events-none fixed right-0 top-1/2 -z-20 w-80 -translate-y-1/2 translate-x-1/2 select-none animate-[spin_20s_linear_infinite] transition-opacity duration-500 sm:w-[28rem] md:w-[34rem] lg:w-[40rem]",
          videoInView ? "opacity-0" : "opacity-100",
        )}
      />

      {/* Bento grid */}
      <section className="mx-auto mt-12 max-w-6xl px-4 md:px-6">
        <div className="grid auto-rows-[10rem] grid-cols-2 gap-4 md:grid-cols-4">
          <button
            type="button"
            onClick={scrollToVideo}
            aria-label={t("kino.playVideoAria")}
            className="group relative -z-10 col-span-2 row-span-2 grid place-items-center"
          >
            <img
              src={kinoHero}
              alt="Ilustração Kino.com"
              className="h-full w-full object-contain"
            />
            <span className="absolute grid h-16 w-16 place-items-center rounded-full bg-white text-primary shadow-lg transition-transform group-hover:scale-110">
              <Play className="h-6 w-6 translate-x-0.5" />
            </span>
          </button>

          <div className="col-span-2 flex flex-col justify-center rounded-[2rem] border border-border bg-card p-6">
            <h3 className="font-display text-xl font-bold text-primary">{t("kino.bentoTitle")}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{t("kino.bentoDescription")}</p>
          </div>

          <ExpandableIllustration
            src={dateIllustration}
            alt={t("kino.illustration1Alt")}
            title={t("kino.illustration1Title")}
            description={t("kino.illustration1Description")}
            className="col-span-1 row-span-1"
          />
          <ExpandableIllustration
            src={menuIllustration}
            alt={t("kino.illustration2Alt")}
            title={t("kino.illustration2Title")}
            description={t("kino.illustration2Description")}
            className="col-span-1 row-span-1"
          />

          <button
            type="button"
            onClick={scrollToVideo}
            className="col-span-2 flex flex-col justify-center rounded-[2rem] bg-primary p-6 text-left text-primary-foreground"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15">
              <MapPin className="h-5 w-5" />
            </span>
            <h3 className="mt-4 font-display text-xl font-bold">{t("kino.nearYouTitle")}</h3>
            <p className="mt-2 text-sm text-primary-foreground/80">
              {t("kino.nearYouDescription")}
            </p>
          </button>

          <ExpandableIllustration
            src={chiefIllustration}
            alt={t("kino.illustration3Alt")}
            title={t("kino.illustration3Title")}
            description={t("kino.illustration3Description")}
            className="col-span-2 row-span-1"
          />
        </div>
      </section>

      {/* Call to action */}
      <section className="mx-auto mb-20 mt-16 max-w-6xl px-4 md:px-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col items-start gap-4 rounded-[2rem] bg-surface p-8 sm:p-10">
            <h2 className="font-display text-2xl font-extrabold text-primary sm:text-3xl">
              {t("kino.ctaRestaurantTitle")}
            </h2>
            <p className="max-w-sm text-muted-foreground">{t("kino.ctaRestaurantDescription")}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Link
                to="/parceiros"
                className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90"
              >
                {t("kino.restaurantLogin")}
              </Link>
            </div>
          </div>

          <div className="flex flex-col items-start gap-4 rounded-[2rem] bg-primary p-8 text-primary-foreground sm:p-10">
            <h2 className="font-display text-2xl font-extrabold sm:text-3xl">
              {t("kino.ctaCustomerTitle")}
            </h2>
            <p className="max-w-sm text-primary-foreground/85">
              {t("kino.ctaCustomerDescription")}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Link
                to="/entrar"
                className="rounded-full bg-background px-6 py-3 text-sm font-semibold text-primary transition-opacity hover:opacity-90"
              >
                {t("kino.login")}
              </Link>
              <Link
                to="/cardapio"
                className="rounded-full border border-primary-foreground/30 px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:border-primary-foreground"
              >
                {t("kino.seeMenu")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto mt-16 max-w-6xl px-4 md:px-6">
        <h2 className="text-2xl font-extrabold text-primary">{t("kino.featuresTitle")}</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="grid gap-4">
            <div className="flex flex-col rounded-[2rem] border border-border bg-card p-6 sm:p-8">
              <h3 className="font-display text-lg font-bold text-primary">
                {t("kino.forCustomersTitle")}
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
                {t("kino.login")} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="flex flex-col rounded-[2rem] border border-border bg-card p-6 sm:p-8">
              <h3 className="font-display text-lg font-bold text-primary">
                {t("kino.forRestaurantsTitle")}
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
                {t("kino.restaurantLogin")} <ArrowRight className="h-4 w-4" />
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
              aria-label={playing ? t("kino.pauseVideoAria") : t("kino.playVideoAria2")}
              className="absolute inset-0 z-10 grid place-items-center"
            >
              <video
                ref={videoRef}
                src={kinoVideo}
                loop
                muted={muted}
                playsInline
                preload="none"
                poster={kinoHero}
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
              aria-label={muted ? t("kino.unmuteAria") : t("kino.muteAria")}
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
