import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      // Topo, não fundo — no fundo ficavam por cima do card que soma o
      // pedido (ex.: ao adicionar pratos no cardápio de um restaurante).
      // Um pouco abaixo do header (que tem 64px) e com duração mais curta,
      // já que são só avisos de atividade (pedido/reserva), não precisam
      // de ficar tanto tempo no ecrã.
      position="top-right"
      offset={{ top: "76px" }}
      duration={3000}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
