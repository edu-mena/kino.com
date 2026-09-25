import { Briefcase, Cake, Package, PartyPopper, Users, type LucideIcon } from "lucide-react";

/** Ícones conhecidos do seed de tipos de pacote — qualquer outro nome
 * digitado em `/sistema/pacotes` cai no genérico (`Package`), nunca quebra
 * a lista por um nome de ícone desconhecido. Partilhado entre o painel de
 * sistema e a descoberta pública (`/pacotes`, Fase L3d), que mostram o
 * mesmo ícone para o mesmo tipo. */
const ICON_MAP: Record<string, LucideIcon> = {
  cake: Cake,
  briefcase: Briefcase,
  users: Users,
  "party-popper": PartyPopper,
};

export function packageTypeIcon(icon?: string): LucideIcon {
  return (icon && ICON_MAP[icon]) || Package;
}
