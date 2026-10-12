import { useCallback, useEffect, useState } from "react";
import { fetchApiRestaurantQr, saveApiQrStyle } from "@/data/api-qr";
import { safeLocalStorageSet } from "@/data/safe-storage";
import { mockQrCode } from "@/data/tables-store";
import { hasRealBackend } from "@/lib/api-client";
import { publicSiteBaseUrl } from "@/lib/public-url";
import { DEFAULT_QR_STYLE, normalizeQrStyle, type QrStyle } from "@/lib/qr-style";
import { getAdminToken } from "@/lib/restaurant-admin";

/** Link curto impresso no QR — sempre o domínio público (nunca localhost
 * nem IP de rede local, ver @/lib/public-url). */
export function qrLink(code: string): string {
  return `${publicSiteBaseUrl()}/q/${code}`;
}

const styleKey = (restaurantId: string) => `luku_qr_style_${restaurantId}`;

/**
 * Código QR geral do restaurante + estilo de impressão guardado (estúdio
 * de QR em `/admin/mesas`). Com backend real vem de
 * `GET /restaurants/{id}/qr-codes`; no modo demo, código determinístico e
 * estilo no localStorage.
 */
export function useRestaurantQr(restaurantId: string | undefined) {
  const [code, setCode] = useState<string | null>(null);
  const [scans, setScans] = useState(0);
  const [totalScans, setTotalScans] = useState(0);
  const [style, setStyle] = useState<QrStyle>(DEFAULT_QR_STYLE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!restaurantId) return;
    let cancelled = false;
    if (!hasRealBackend) {
      setCode(mockQrCode(`restaurant:${restaurantId}`));
      try {
        const raw = window.localStorage.getItem(styleKey(restaurantId));
        setStyle(normalizeQrStyle(raw ? JSON.parse(raw) : null));
      } catch {
        setStyle(DEFAULT_QR_STYLE);
      }
      setLoaded(true);
      return;
    }
    const token = getAdminToken();
    if (!token) return;
    fetchApiRestaurantQr(restaurantId, token)
      .then((info) => {
        if (cancelled) return;
        setCode(info.code);
        setScans(info.scans);
        setTotalScans(info.totalScans);
        setStyle(info.style);
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [restaurantId]);

  const saveStyle = useCallback(
    async (next: QrStyle): Promise<boolean> => {
      if (!restaurantId) return false;
      if (!hasRealBackend) {
        return safeLocalStorageSet(styleKey(restaurantId), JSON.stringify(next));
      }
      const token = getAdminToken();
      if (!token) return false;
      try {
        await saveApiQrStyle(restaurantId, next, token);
        return true;
      } catch {
        return false;
      }
    },
    [restaurantId],
  );

  return { code, scans, totalScans, style, setStyle, saveStyle, loaded };
}
