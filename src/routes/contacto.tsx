import { createFileRoute } from "@tanstack/react-router";
import { Mail, MapPin, Phone, Send } from "lucide-react";
import { useState, type SVGProps } from "react";
import { toast } from "sonner";
import dishFries from "@/assets/dish-fries.png";
import icon from "@/assets/icon.png";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeading, PageShell, SiteHeader } from "@/components/site-shell";

export const Route = createFileRoute("/contacto")({
  head: () => ({
    meta: [
      { title: "Contacto — Kino.com" },
      {
        name: "description",
        content: "Fale com a equipa da Kino: dúvidas, parcerias e suporte, tudo num só lugar.",
      },
      { property: "og:title", content: "Contacto — Kino.com" },
      { property: "og:image", content: icon },
    ],
  }),
  component: Contacto,
});

function WhatsAppIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M17.47 14.38c-.29-.15-1.72-.85-1.99-.94-.27-.1-.46-.15-.66.15-.2.29-.75.94-.92 1.13-.17.2-.34.22-.63.07-.29-.15-1.22-.45-2.32-1.43-.86-.76-1.44-1.71-1.6-2-.17-.29-.02-.45.13-.6.13-.13.29-.34.44-.51.15-.17.2-.29.29-.49.1-.2.05-.37-.02-.51-.07-.15-.66-1.59-.91-2.18-.24-.57-.48-.5-.66-.51h-.56c-.2 0-.51.07-.78.37-.27.29-1.02 1-1.02 2.44s1.05 2.83 1.19 3.03c.15.2 2.06 3.15 5 4.42.7.3 1.24.48 1.67.61.7.22 1.34.19 1.84.12.56-.08 1.72-.7 1.96-1.38.24-.68.24-1.26.17-1.38-.07-.12-.27-.2-.56-.34Z" />
      <path d="M20.52 3.48A11.86 11.86 0 0 0 12.06 0C5.5 0 .17 5.3.17 11.85c0 2.08.55 4.11 1.6 5.9L0 24l6.42-1.68a11.9 11.9 0 0 0 5.63 1.43h.01c6.55 0 11.88-5.3 11.88-11.85 0-3.17-1.24-6.14-3.42-8.42ZM12.06 21.5a9.6 9.6 0 0 1-4.9-1.34l-.35-.21-3.63.95.97-3.53-.23-.36a9.55 9.55 0 0 1-1.47-5.16c0-5.3 4.32-9.6 9.63-9.6a9.57 9.57 0 0 1 6.79 2.81 9.5 9.5 0 0 1 2.82 6.78c0 5.3-4.33 9.66-9.63 9.66Z" />
    </svg>
  );
}

const inputClass =
  "w-full min-w-0 rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none transition-colors focus:border-primary";

const contactInfo = [
  { icon: Mail, title: "Email", text: "ola@kino.com" },
  { icon: Phone, title: "Telefone", text: "+244 923 456 789" },
  { icon: MapPin, title: "Morada", text: "Luanda, Angola" },
];

const subjects = [
  { value: "duvida", label: "Dúvida geral" },
  { value: "parceria", label: "Sou restaurante / Parceria" },
  { value: "suporte", label: "Suporte técnico" },
  { value: "imprensa", label: "Imprensa" },
  { value: "outro", label: "Outro assunto" },
];

const faqs = [
  {
    question: "A Kino faz entregas?",
    answer:
      "A Kino é, antes de tudo, o cardápio digital de um restaurante. A entrega é uma funcionalidade opcional que cada restaurante ativa se quiser oferecer — nem todos entregam.",
  },
  {
    question: "É grátis para usar como cliente?",
    answer:
      "Sim. Explorar cardápios, reservar mesas e fazer pedidos na Kino não tem qualquer custo para o cliente.",
  },
  {
    question: "Como coloco o meu restaurante na Kino?",
    answer:
      'Escolha "Sou restaurante / Parceria" no formulário abaixo ou visite a página de parceiros — a nossa equipa entra em contacto para configurar o seu cardápio digital.',
  },
  {
    question: "Posso personalizar os meus pedidos?",
    answer:
      "Sim, sempre que o restaurante disponibilizar essa opção você pode escolher os ingredientes do seu prato antes de finalizar o pedido.",
  },
  {
    question: "Quanto tempo demora o suporte a responder?",
    answer: "A nossa equipa costuma responder em até 24 horas úteis, por email ou telefone.",
  },
];

function Contacto() {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      toast.success("Mensagem enviada! A nossa equipa responde em breve.");
      (e.target as HTMLFormElement).reset();
      setSubmitting(false);
    }, 600);
  };

  return (
    <PageShell header={<SiteHeader variant="guestHome" />} footer={null} showMobileTabBar={false}>
      <div className="mx-auto flex max-w-6xl flex-nowrap items-center justify-start px-4 md:px-6">
        <PageHeading
          eyebrow="Contacto"
          title="Fale connosco"
          description="Dúvidas, parcerias ou sugestões — a nossa equipa está aqui para ajudar."
          className="w-4/5 mx-0 max-w-none px-0 md:w-auto md:px-0"
        />
        <div className="w-1/5 shrink-0 overflow-hidden md:w-44 md:overflow-visible">
          <img
            src={dishFries}
            alt=""
            aria-hidden
            className="relative -z-10 w-[130%] max-w-none translate-x-1 select-none object-contain md:w-44 md:translate-x-0"
          />
        </div>
      </div>

      {/* Contact info */}
      <section className="mx-auto mt-10 max-w-6xl px-4 md:px-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {contactInfo.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-border bg-card p-5 text-left"
            >
              <item.icon className="h-8 w-8 text-brand" />
              <h3 className="mt-4 font-display text-base font-bold text-primary">{item.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
            </div>
          ))}

          <a
            href="https://wa.me/244930814277"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-primary p-5 text-center text-primary-foreground transition-opacity hover:opacity-90"
          >
            <WhatsAppIcon className="h-8 w-8" />
            <h3 className="mt-3 font-display text-base font-bold">WhatsApp</h3>
            <p className="text-sm text-primary-foreground/85">Fale com o Diretor</p>
          </a>
        </div>
      </section>

      {/* Form */}
      <section className="mx-auto mt-14 max-w-6xl px-4 md:px-6">
        <div className="rounded-[2rem] border border-border bg-card p-6 sm:p-10">
          <h2 className="text-2xl font-extrabold text-primary">Envie uma mensagem</h2>
          <form onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
            <input required placeholder="O seu nome" autoComplete="name" className={inputClass} />
            <input
              required
              type="email"
              placeholder="O seu email"
              autoComplete="email"
              className={inputClass}
            />

            <Select required name="subject" defaultValue="">
              <SelectTrigger className="h-auto rounded-xl border-border bg-card px-4 py-3 text-sm text-foreground focus:ring-1 focus:ring-primary sm:col-span-2">
                <SelectValue placeholder="Assunto" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-border p-2 shadow-lg">
                {subjects.map((s) => (
                  <SelectItem
                    key={s.value}
                    value={s.value}
                    className="rounded-lg py-2.5 pl-3 focus:bg-surface focus:text-foreground"
                  >
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <textarea
              required
              placeholder="A sua mensagem"
              rows={5}
              className={`${inputClass} resize-none sm:col-span-2`}
            />

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 self-start rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60 sm:col-span-2"
            >
              {submitting ? "A enviar..." : "Enviar mensagem"} <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto mb-20 mt-14 max-w-6xl px-4 md:px-6">
        <h2 className="text-2xl font-extrabold text-primary">Perguntas frequentes</h2>
        <Accordion type="single" collapsible className="mt-5 space-y-3">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={faq.question}
              value={`item-${i}`}
              className="rounded-2xl border border-border bg-card px-6"
            >
              <AccordionTrigger className="text-left font-display text-base font-bold text-primary hover:no-underline">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </PageShell>
  );
}
