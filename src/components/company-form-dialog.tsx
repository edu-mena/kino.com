import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Company } from "@/data/types";
import { useTranslation } from "@/i18n";
import { useCompanies } from "@/lib/companies";

/**
 * Formulário de "nova empresa" (nome/NIF/email), usado em dois lugares:
 * `/perfil` (gestão das empresas guardadas) e no cartão de pedido
 * (`order-builder-card.tsx`, ao pedir fatura com NIF sem já ter uma
 * empresa guardada). Controlado de fora (`open`/`onOpenChange`) — sem
 * `DialogTrigger` próprio — para cada chamador usar o botão que fizer
 * sentido no seu ecrã.
 */
export function CompanyFormDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Chamado com a empresa recém-criada, já vinda do servidor. */
  onCreated?: (company: Company) => void;
}) {
  const { t } = useTranslation();
  const { createCompany } = useCompanies();
  const [name, setName] = useState("");
  const [nif, setNif] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName("");
    setNif("");
    setEmail("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !nif.trim() || !email.trim() || saving) return;
    setSaving(true);
    const company = await createCompany({
      name: name.trim(),
      nif: nif.trim(),
      email: email.trim(),
    });
    setSaving(false);
    if (!company) {
      toast.error(t("companyForm.saveErrorToast"));
      return;
    }
    toast.success(t("companyForm.savedToast"));
    reset();
    onOpenChange(false);
    onCreated?.(company);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-sm rounded-[1.5rem] border-none bg-card p-6">
        <DialogTitle className="font-display text-lg font-bold">
          {t("companyForm.title")}
        </DialogTitle>
        <DialogDescription>{t("companyForm.description")}</DialogDescription>
        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="company-name">{t("companyForm.nameLabel")}</Label>
            <Input
              id="company-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("companyForm.namePlaceholder")}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="company-nif">{t("companyForm.nifLabel")}</Label>
            <Input
              id="company-nif"
              value={nif}
              onChange={(e) => setNif(e.target.value)}
              placeholder={t("companyForm.nifPlaceholder")}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="company-email">{t("companyForm.emailLabel")}</Label>
            <Input
              id="company-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("companyForm.emailPlaceholder")}
              required
            />
          </div>
          <Button type="submit" disabled={saving} className="w-full rounded-xl">
            {t("companyForm.save")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
