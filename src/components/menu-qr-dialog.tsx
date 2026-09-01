import { QRCodeCanvas } from "qrcode.react";
import { Copy, Download } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "@/i18n";

/**
 * QR code que abre o cardápio público (`/menu/$restaurantId`). Ao ler,
 * o cliente entra com o Google (simulado) e vê o cardápio + um botão para
 * a página do restaurante no lado do cliente.
 */
export function MenuQrDialog({
  open,
  onOpenChange,
  restaurantId,
  restaurantName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId: string;
  restaurantName: string;
}) {
  const { t } = useTranslation();
  const wrap = useRef<HTMLDivElement>(null);

  // Base absoluta do link do QR. Em desenvolvimento, defina
  // `VITE_PUBLIC_BASE_URL` no `.env.local` (ex: http://192.168.1.194:8081)
  // para o QR apontar para o IP da máquina na rede local e poder ser lido
  // pelo telemóvel. Sem isso, usa a origem atual do browser.
  const envBase = import.meta.env["VITE_PUBLIC_BASE_URL"] as string | undefined;
  const base =
    envBase?.replace(/\/$/, "") || (typeof window !== "undefined" ? window.location.origin : "");
  const url = `${base}/menu/${restaurantId}`;

  const downloadPng = () => {
    const canvas = wrap.current?.querySelector("canvas");
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `kino-cardapio-qr-${restaurantId}.png`;
    a.click();
  };

  const copyLink = () => {
    navigator.clipboard?.writeText(url).then(
      () => toast.success(t("menuQrDialog.linkCopiedToast")),
      () => toast.error(t("menuQrDialog.copyFailedToast")),
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-[1.5rem] border-none bg-card p-6 text-center">
        <DialogTitle className="font-display text-lg font-bold">
          {t("menuQrDialog.title")}
        </DialogTitle>
        <DialogDescription>{t("menuQrDialog.description")}</DialogDescription>

        <div
          ref={wrap}
          className="mx-auto mt-4 flex w-fit flex-col items-center gap-3 rounded-2xl border border-border bg-white p-5"
        >
          <img src={logo} alt="Kino.com" className="h-6 w-auto" />
          <QRCodeCanvas value={url} size={196} level="H" marginSize={2} />
          <p className="max-w-[196px] text-sm font-bold text-neutral-800">{restaurantName}</p>
        </div>

        <p className="mt-2 break-all text-[11px] text-muted-foreground">{url}</p>

        <div className="mt-4 flex gap-2">
          <Button variant="outline" onClick={copyLink} className="flex-1 rounded-xl">
            <Copy className="h-4 w-4" /> {t("menuQrDialog.copyLink")}
          </Button>
          <Button onClick={downloadPng} className="flex-1 rounded-xl">
            <Download className="h-4 w-4" /> {t("menuQrDialog.download")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
