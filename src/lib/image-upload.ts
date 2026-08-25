/**
 * Lê um ficheiro de imagem escolhido pelo usuário e devolve um data URL
 * redimensionado (máx. `maxDimension` no lado maior, JPEG a ~75% de
 * qualidade). Sem backend/upload real, a imagem fica guardada tal e qual no
 * localStorage — uma foto de telemóvel sem redimensionar facilmente
 * ultrapassa a quota do browser (~5-10MB por origem, para TODOS os dados da
 * app), por isso o redimensionamento aqui não é opcional.
 */
export function fileToResizedDataUrl(file: File, maxDimension = 800): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("O ficheiro escolhido não é uma imagem."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler o ficheiro."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Não foi possível processar a imagem."));
      img.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("O navegador não suporta o processamento de imagens."));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
