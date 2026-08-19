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
import kinoHero from "@/assets/kino/hero.png";
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

const forCustomers = [
  { icon: MapPin, text: "Explore restaurantes, pratos e preços perto de você" },
  { icon: BookOpen, text: "Cardápios completos e sempre atualizados" },
  { icon: CalendarCheck, text: "Agende mesas em poucos toques" },
  { icon: Bike, text: "Peça entrega, quando o restaurante disponibilizar" },
  { icon: SlidersHorizontal, text: "Personalize o pedido escolhendo os ingredientes" },
  { icon: Bell, text: "Receba promoções e novidades direto do restaurante" },
];

const forRestaurants = [
  { icon: QrCode, text: "Cardápio digital acessível por QR Code" },
  { icon: UtensilsCrossed, text: "Cadastre e personalize os seus pratos" },
  { icon: CalendarCheck, text: "Gerencie mesas e reservas" },
  { icon: Megaphone, text: "Anuncie promoções para os seus clientes" },
  { icon: Users, text: "Acompanhe e gerencie a sua base de clientes" },
];

function Kino() {
  const videoSectionRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [videoInView, setVideoInView] = useState(false);

  // Hide the spinning plate whenever the video is on screen — with both
  // visible and both moving, the plate turns into a distracting element.
  useEffect(() => {
    const el = videoSectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => setVideoInView(entries[0]?.isIntersecting ?? false),
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
            aria-label="Ver vídeo"
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
            <h3 className="font-display text-xl font-bold text-primary">
              Um cardápio digital para cada restaurante
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Pratos, preços e disponibilidade sempre atualizados — direto do restaurante para o
              seu telemóvel.
            </p>
          </div>

          <ExpandableIllustration
            src={dateIllustration}
            alt="Casal que já sabe onde ir com a Kino"
            title="Já sabemos onde ir"
            description="Explore restaurantes por perto e deixe que a Kino leve você direto à porta certa — sem perder tempo a decidir."
            className="col-span-1 row-span-1"
          />
          <ExpandableIllustration
            src={menuIllustration}
            alt="QR Code que dá acesso ao cardápio"
            title="Cardápio sem contacto"
            description="Aponte a câmara para o QR Code da mesa e veja o cardápio completo do restaurante, direto no seu telemóvel."
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
            <h3 className="mt-4 font-display text-xl font-bold">Restaurantes perto de você</h3>
            <p className="mt-2 text-sm text-primary-foreground/80">
              Descubra o que está por perto com base na sua localização, em qualquer bairro de
              Luanda.
            </p>
          </button>

          <ExpandableIllustration
            src={chiefIllustration}
            alt="Chef que gere clientes através da app"
            title="Gestão para o restaurante"
            description="O restaurante conversa com clientes, confirma pedidos e acompanha tudo em tempo real, direto da app."
            className="col-span-2 row-span-1"
          />
        </div>
      </section>

      {/* Call to action */}
      <section className="mx-auto mb-20 mt-16 max-w-6xl px-4 md:px-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col items-start gap-4 rounded-[2rem] bg-surface p-8 sm:p-10">
            <h2 className="font-display text-2xl font-extrabold text-primary sm:text-3xl">
              Tem um restaurante?
            </h2>
            <p className="max-w-sm text-muted-foreground">
              Leve o seu cardápio para a Kino: QR Code, pratos, mesas e clientes num só lugar.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Link
                to="/parceiros"
                className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90"
              >
                Login de restaurante
              </Link>
            </div>
          </div>
          
          <div className="flex flex-col items-start gap-4 rounded-[2rem] bg-primary p-8 text-primary-foreground sm:p-10">
            <h2 className="font-display text-2xl font-extrabold sm:text-3xl">Quer pedir?</h2>
            <p className="max-w-sm text-primary-foreground/85">
              Entre na sua conta para explorar o cardápio dos melhores restaurantes de Luanda.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Link
                to="/entrar"
                className="rounded-full bg-background px-6 py-3 text-sm font-semibold text-primary transition-opacity hover:opacity-90"
              >
                Fazer Login
              </Link>
              <Link
                to="/cardapio"
                className="rounded-full border border-primary-foreground/30 px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:border-primary-foreground"
              >
                Ver cardápio
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto mt-16 max-w-6xl px-4 md:px-6">
        <h2 className="text-2xl font-extrabold text-primary">Funcionalidades</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="grid gap-4">
            <div className="flex flex-col rounded-[2rem] border border-border bg-card p-6 sm:p-8">
              <h3 className="font-display text-lg font-bold text-primary">Para quem quer comer</h3>
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
                Fazer Login <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="flex flex-col rounded-[2rem] border border-border bg-card p-6 sm:p-8">
              <h3 className="font-display text-lg font-bold text-primary">Para restaurantes</h3>
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
                Login de restaurante <ArrowRight className="h-4 w-4" />
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
              aria-label={playing ? "Pausar vídeo" : "Reproduzir vídeo"}
              className="absolute inset-0 z-10 grid place-items-center"
            >
              <video
                ref={videoRef}
                src={kinoVideo}
                autoPlay
                loop
                muted={muted}
                playsInline
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
              aria-label={muted ? "Ativar som" : "Desativar som"}
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
