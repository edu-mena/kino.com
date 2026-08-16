import logo from "@/assets/logo.png";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <img 
      src={logo} 
      alt="Kino.com" 
      className={compact ? "h-6 w-auto" : "h-10 w-auto"} 
    />
  );
}