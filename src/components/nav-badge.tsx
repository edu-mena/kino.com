/** Badge de contagem sobre um ícone de navegação (Fase N4) — mesmo idiom
 * visual já usado no sino (`notifications-bell.tsx`) e no carrinho
 * (`left-sidebar.tsx`/`site-shell.tsx`), agora partilhado para não repetir a
 * mesma classe 6+ vezes. O elemento pai precisa de `relative` (ou ser um
 * `<span className="relative">` a envolver só o ícone) para isto se
 * posicionar corretamente. */
export function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-brand-foreground">
      {count > 9 ? "9+" : count}
    </span>
  );
}
