import { apiFetch, hasRealBackend } from "@/lib/api-client";

/** Alinhado com `purpose` em
 * backend/app/Http/Requests/Api/V1/Uploads/StoreUploadRequest.php — só
 * imagens (o upload de vídeo é um pipeline à parte, com transcodificação
 * assíncrona, ver `ProcessUploadedVideoJob`; não usa este endpoint). */
export type UploadPurpose = "dish" | "cover" | "gallery" | "promo" | "story";

export function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, base64] = dataUrl.split(",");
  const mime = header?.match(/data:(.*);base64/)?.[1] ?? "image/jpeg";
  const binary = atob(base64 ?? "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

/**
 * Envia uma imagem (data URL, já redimensionada por
 * `fileToResizedDataUrl`/`ImageCropper`) para `POST /uploads` e devolve o
 * URL real (Cloudflare R2/Tigris) — usado por `ImageUploadField` quando há
 * backend real e um `token`. Sem backend real, ou sem token, quem chama
 * deve continuar a usar a data URL tal e qual (comportamento de sempre).
 */
export async function uploadImageDataUrl(
  dataUrl: string,
  purpose: UploadPurpose,
  token: string,
): Promise<string> {
  if (!hasRealBackend) return dataUrl;
  const file = dataUrlToFile(dataUrl, `${purpose}.jpg`);
  const body = new FormData();
  body.append("file", file);
  body.append("purpose", purpose);
  const { data } = await apiFetch<{ data: { url: string } }>("/uploads", {
    method: "POST",
    token,
    body,
  });
  return data.url;
}
