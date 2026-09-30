import { useId } from "react";
import { cn } from "@/lib/utils";

export type LanguageCode = "pt" | "en" | "fr";

/**
 * Bandeira do idioma — SVG inline e não emoji: no Windows os emojis de
 * bandeira aparecem como as letras "PT"/"FR", não como bandeira. Português
 * usa a bandeira de Angola (o público da Luku), inglês a do Reino Unido e
 * francês a de França. Decorativa (`aria-hidden`): o nome/sigla do idioma
 * vai sempre ao lado, em texto.
 */
export function LanguageFlag({ code, className }: { code: LanguageCode; className?: string }) {
  const uid = useId();
  return (
    <svg
      viewBox="0 0 30 20"
      aria-hidden
      preserveAspectRatio="xMidYMid slice"
      className={cn(
        "inline-block h-3.5 w-5 shrink-0 overflow-hidden rounded-[3px] ring-1 ring-black/10",
        className,
      )}
    >
      {code === "pt" ? <AngolaFlag /> : code === "en" ? <UkFlag uid={uid} /> : <FranceFlag />}
    </svg>
  );
}

function AngolaFlag() {
  return (
    <>
      <rect width="30" height="10" fill="#CC092F" />
      <rect y="10" width="30" height="10" fill="#000" />
      <g fill="none" stroke="#FFCB00" strokeLinecap="round">
        {/* Meia roda dentada */}
        <path d="M18.6 6.4a5 5 0 1 1-7.2 7.1" strokeWidth="1.5" strokeDasharray="1.1 0.7" />
        {/* Catana */}
        <path d="M11.8 14.4 17.8 7.6" strokeWidth="1.1" />
      </g>
      {/* Estrela */}
      <path
        fill="#FFCB00"
        d="m13.6 6.3.46 1.4h1.47l-1.19.87.45 1.4-1.19-.87-1.19.87.45-1.4-1.19-.87h1.47z"
      />
    </>
  );
}

function UkFlag({ uid }: { uid: string }) {
  // `useId` devolve algo como ":r1:" — os ":" partiam a referência `url(#…)`.
  const clip = `${uid.replace(/[^a-zA-Z0-9_-]/g, "")}-uk`;
  return (
    <>
      <defs>
        <clipPath id={clip}>
          <path d="M15 10h15v10zv10H0zH0V0zV0h15z" />
        </clipPath>
      </defs>
      <rect width="30" height="20" fill="#012169" />
      <path d="M0 0l30 20M30 0L0 20" stroke="#fff" strokeWidth="4" />
      <path
        d="M0 0l30 20M30 0L0 20"
        stroke="#C8102E"
        strokeWidth="2.4"
        clipPath={`url(#${clip})`}
      />
      <path d="M15 0v20M0 10h30" stroke="#fff" strokeWidth="6" />
      <path d="M15 0v20M0 10h30" stroke="#C8102E" strokeWidth="3.6" />
    </>
  );
}

function FranceFlag() {
  return (
    <>
      <rect width="10" height="20" fill="#002654" />
      <rect x="10" width="10" height="20" fill="#fff" />
      <rect x="20" width="10" height="20" fill="#CE1126" />
    </>
  );
}
