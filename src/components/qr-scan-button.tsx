import { useRouter } from "@tanstack/react-router";
import { QrCode } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "@/i18n";
import { lukuPathFrom } from "@/lib/deep-links";
import { openAppSettings } from "@/lib/native-permissions";

/**
 * Ler um código QR com a câmara, dentro da própria app (iOS/Android) — os
 * QR das mesas e montras (`luku.ao/q/...`) abrem logo a página certa na
 * app, sem passar pelo browser. O pedido de permissão da câmara é o do
 * próprio sistema (texto em Info.plist: NSCameraUsageDescription).
 *
 * Só para QR da Luku: um código de outro site nunca é aberto sozinho.
 */
export function QrScanButton() {
  const { t } = useTranslation();
  const router = useRouter();
  const [scanning, setScanning] = useState(false);

  const scan = async () => {
    if (scanning) return;
    setScanning(true);
    try {
      const { CapacitorBarcodeScanner, CapacitorBarcodeScannerTypeHint } =
        await import("@capacitor/barcode-scanner");
      const result = await CapacitorBarcodeScanner.scanBarcode({
        hint: CapacitorBarcodeScannerTypeHint.QR_CODE,
        scanInstructions: t("qrScan.instructions"),
        cancelButtonAccessibilityLabel: t("qrScan.cancel"),
        torchButtonOnAccessibilityLabel: t("qrScan.torchOff"),
        torchButtonOffAccessibilityLabel: t("qrScan.torchOn"),
      });
      const text = result.ScanResult?.trim() ?? "";
      if (!text) return;

      const path = lukuPathFrom(text);
      if (path) {
        void router.history.push(path);
      } else {
        toast.error(t("qrScan.notLuku"));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : String(error);
      if (message.includes("cancel")) return; // fechou o leitor
      if (
        message.includes("permission") ||
        message.includes("denied") ||
        message.includes("authoriz")
      ) {
        toast.error(t("qrScan.permissionDenied"), {
          action: { label: t("qrScan.openSettings"), onClick: () => void openAppSettings() },
        });
        return;
      }
      toast.error(t("qrScan.error"));
    } finally {
      setScanning(false);
    }
  };

  return (
    <button
      type="button"
      onClick={scan}
      disabled={scanning}
      aria-label={t("qrScan.button")}
      className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-card text-foreground transition-colors hover:border-primary disabled:opacity-60"
    >
      <QrCode className="h-4 w-4" />
    </button>
  );
}
