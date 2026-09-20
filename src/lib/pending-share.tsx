import { Capacitor } from "@capacitor/core";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { fileToDataUrl, MAX_DOCUMENT_PDF_BYTES } from "@/lib/image-upload";
import { useTranslation } from "@/i18n";

export type PendingShareFile = {
  dataUrl: string;
  mimeType: string;
  name: string;
};

type PendingShareValue = {
  /** Ficheiro recebido de outra app (ex: comprovativo dum banco) via
   * "Partilhar" — `null` fora da app nativa ou enquanto nada chegou.
   * Consumido pelo `PendingShareDialog` (ver `@/components`). */
  pendingShare: PendingShareFile | null;
  clearPendingShare: () => void;
};

const PendingShareContext = createContext<PendingShareValue | null>(null);

const ACCEPTED_MIME = /^image\//;

/**
 * Recebe ficheiros partilhados doutras apps (ex: um banco/carteira digital,
 * ao carregar em "Partilhar" no comprovativo) através do
 * `@capgo/capacitor-share-target` — é o que faz a Luku aparecer na folha de
 * partilha nativa do Android (ver `AndroidManifest.xml`; o arranque a frio
 * já funciona sozinho, o `BridgeActivity` de que `MainActivity` estende já
 * trata disso). Sem equivalente no iOS aqui: precisa de uma Share Extension
 * própria no projeto Xcode, fora deste repositório (ver README do
 * `capacitor/`).
 *
 * Só guarda o ficheiro — decidir para onde vai (comprovativo de um pedido,
 * fatura de um restaurante) é o `PendingShareDialog`, montado uma vez na
 * raiz (`__root.tsx`) para reagir esteja o utilizador onde estiver na app.
 */
export function PendingShareProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [pendingShare, setPendingShare] = useState<PendingShareFile | null>(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cancelled = false;
    let handle: { remove: () => void } | undefined;

    import("@capgo/capacitor-share-target").then(({ CapacitorShareTarget }) => {
      if (cancelled) return;
      CapacitorShareTarget.addListener("shareReceived", async (event) => {
        const file = event.files?.[0];
        if (!file) return;
        const isPdf = file.mimeType === "application/pdf";
        if (!isPdf && !ACCEPTED_MIME.test(file.mimeType)) {
          // só imagem/PDF — o resto não serve de comprovativo/fatura
          toast.error(t("pendingShare.unsupportedFile"));
          return;
        }

        try {
          const response = await fetch(Capacitor.convertFileSrc(file.uri));
          const blob = await response.blob();
          if (isPdf && blob.size > MAX_DOCUMENT_PDF_BYTES) {
            // mesmo limite dos uploads normais
            toast.error(t("pendingShare.fileTooLarge"));
            return;
          }
          const dataUrl = await fileToDataUrl(blob);
          if (!cancelled) setPendingShare({ dataUrl, mimeType: file.mimeType, name: file.name });
        } catch {
          // ficheiro ilegível (URI expirado, etc.)
          if (!cancelled) toast.error(t("pendingShare.readError"));
        }
      }).then((h) => {
        if (cancelled) h.remove();
        else handle = h;
      });
    });

    return () => {
      cancelled = true;
      handle?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só regista o listener uma vez; `t` muda de idioma sem precisar de o recriar.
  }, []);

  return (
    <PendingShareContext.Provider
      value={{ pendingShare, clearPendingShare: () => setPendingShare(null) }}
    >
      {children}
    </PendingShareContext.Provider>
  );
}

export function usePendingShare() {
  const ctx = useContext(PendingShareContext);
  if (!ctx) throw new Error("usePendingShare must be used inside PendingShareProvider");
  return ctx;
}

/** Chave usada por `restaurant-admin.tsx` — lido diretamente (sem o
 * provider completo, que só existe dentro de `/admin`/`/sistema`) só para
 * saber, a partir da raiz, se há uma sessão de restaurante neste aparelho. */
const RESTAURANT_ID_KEY = "luku_admin_restaurant";

/** O restaurante da sessão de painel ativa neste aparelho (`null` se
 * nenhuma) — usado pelo `PendingShareDialog` para decidir se oferece
 * "emitir fatura" como destino do ficheiro partilhado, e para saber logo
 * qual restaurante (só gere um de cada vez). Não valida o token contra o
 * backend (só a UI de escolha; `setInvoice` continua a exigir a sessão real
 * de `/admin/pedidos`). */
export function getManagedRestaurantId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(RESTAURANT_ID_KEY);
  } catch {
    return null;
  }
}
