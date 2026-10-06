import { QRCodeCanvas } from "qrcode.react";
import { Copy, Download } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "@/i18n";
import { publicSiteBaseUrl } from "@/lib/public-url";

/**
 * QR code que abre o cardápio público (`/menu/$restaurantId`) — lido com a
 * câmara do telemóvel, sem conta nem app: o cliente vê o cardápio e tem um
 * botão para a página do restaurante.
 *
 * O PNG descarregado é o cartão inteiro para imprimir (logótipo, QR em alta
 * resolução, nome do restaurante, instrução), não só o QR da pré-visualização
 * — antes saía um QR de 196 px sem mais nada, pequeno/desfocado impresso.
 */

/** Resolução do QR no PNG para imprimir (~8 cm a 300 dpi). */
const PRINT_QR_SIZE = 960;
const PRINT_PADDING = 96;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Quebra `text` em linhas que cabem em `maxWidth` (no máximo `maxLines`). */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth || !current) {
      current = next;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = `${lines[maxLines - 1]!.replace(/\s+\S*$/, "")}…`;
  }
  return lines;
}

/** Nome de ficheiro legível: "luku-cardapio-qr-restaurante-rua-11.png". */
function fileSlug(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "restaurante"
  );
}
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
  // QR em alta resolução, fora do ecrã — é dele que sai o PNG para imprimir.
  const printQr = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  // Endereço público do site (nunca um IP de rede local nem localhost, ver
  // @/lib/public-url) — o QR impresso tem de abrir em qualquer telemóvel.
  const url = `${publicSiteBaseUrl()}/menu/${restaurantId}`;

  const downloadPng = async () => {
    const qrCanvas = printQr.current?.querySelector("canvas");
    if (!qrCanvas) return;
    setDownloading(true);
    try {
      const logoImg = await loadImage(logo);
      const width = PRINT_QR_SIZE + PRINT_PADDING * 2;
      const logoHeight = 72;
      const logoWidth = (logoImg.width / logoImg.height) * logoHeight;

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.font = "700 56px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
      const nameLines = wrapText(ctx, restaurantName, PRINT_QR_SIZE, 2);
      const height =
        PRINT_PADDING +
        logoHeight +
        48 +
        PRINT_QR_SIZE +
        56 +
        nameLines.length * 68 +
        24 +
        40 +
        PRINT_PADDING;
      canvas.width = width;
      canvas.height = height;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      let y = PRINT_PADDING;
      ctx.drawImage(logoImg, (width - logoWidth) / 2, y, logoWidth, logoHeight);
      y += logoHeight + 48;
      ctx.imageSmoothingEnabled = false; // módulos do QR nítidos
      ctx.drawImage(qrCanvas, PRINT_PADDING, y, PRINT_QR_SIZE, PRINT_QR_SIZE);
      y += PRINT_QR_SIZE + 56;

      ctx.fillStyle = "#1c1a19";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.font = "700 56px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
      for (const line of nameLines) {
        ctx.fillText(line, width / 2, y);
        y += 68;
      }
      y += 24;
      ctx.fillStyle = "#6c645e";
      ctx.font = "500 34px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText(t("menuQrDialog.scanHint"), width / 2, y);

      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `luku-cardapio-qr-${fileSlug(restaurantName)}.png`;
      a.click();
    } catch {
      toast.error(t("menuQrDialog.downloadFailedToast"));
    } finally {
      setDownloading(false);
    }
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

        {/* Pré-visualização do cartão que vai no PNG. */}
        <div className="mx-auto mt-4 flex w-fit flex-col items-center gap-3 rounded-2xl border border-border bg-white p-5">
          <img src={logo} alt="Luku.com" className="h-6 w-auto" />
          <QRCodeCanvas value={url} size={196} level="H" marginSize={2} />
          <p className="max-w-[196px] text-sm font-bold text-neutral-800">{restaurantName}</p>
          <p className="max-w-[196px] text-[11px] text-neutral-500">{t("menuQrDialog.scanHint")}</p>
        </div>
        <div ref={printQr} aria-hidden className="hidden">
          <QRCodeCanvas value={url} size={PRINT_QR_SIZE} level="H" marginSize={2} />
        </div>

        <p className="mt-2 break-all text-[11px] text-muted-foreground">{url}</p>

        <div className="mt-4 flex gap-2">
          <Button variant="outline" onClick={copyLink} className="flex-1 rounded-xl">
            <Copy className="h-4 w-4" /> {t("menuQrDialog.copyLink")}
          </Button>
          <Button onClick={downloadPng} disabled={downloading} className="flex-1 rounded-xl">
            <Download className="h-4 w-4" /> {t("menuQrDialog.download")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
