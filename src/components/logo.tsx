import logo from "@/assets/logo.png";

export function Logo({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <img
      src={logo}
      alt="Kino.com"
      className={className ?? (compact ? "h-6 w-auto" : "h-10 w-auto")}
    />
  );
}